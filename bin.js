#!/usr/bin/env node

const hyperdrive = require('hyperdrive')
const onrequest = require('hyperdrive-http')
const replicator = require('@hyperswarm/replicator')
const prettier = require('prettier-bytes')

const minimist = require('minimist')

const argv = minimist(process.argv, {
  alias: {
    key: 'k',
    dir: 'd',
    directory: 'd',
    port: 'p',
    help: 'h'
  },
  default: {
    directory: 'hyperbrowse',
    port: 8080
  },
  boolean: ['ram', 'help']
})

if (argv.help) {
  console.error(`Usage: hyperbrowse [options]
-k, --key   The hyperdrive 10 key
-d, --dir   Where to store the data
-p, --port  Which HTTP port to use.
--ram       Only use RAM for storage
`)
  process.exit(0)
}

const key = argv.key ? Buffer.from(argv.key, 'hex') : null
const storage = argv.ram ? require('random-access-memory') : argv.directory
const drive = hyperdrive(storage, key)

const cs = drive._corestore || drive.corestore

const metadatas = new Set()
const contents = new Set()
let first = true // hackish, get feedback from @andrewosh on how to better do this
cs.on('feed', function (feed) {
  const metadata = first
  first = false

  if (metadata) {
    metadatas.add(feed)
    feed.on('download', function (seq, data) {
      metadataBytes += data.length
      metadataBlocks++
    })
  } else {
    contents.add(feed)
    feed.on('download', function (seq, data) {
      contentBytes += data.length
      contentBlocks++
    })
  }
})

let metadataBlocks = 0
let metadataBytes = 0
let contentBlocks = 0
let contentBytes = 0

drive.ready(function (err) {
  if (err) throw err

  console.log('Browsing ' + drive.key.toString('hex'))
  if (drive.metadata.sparse) {
    console.log('Note: running in sparse mode so data is only downloaded when needed')
  }

  let connections = 0
  const set = new Set()
  const swarm = replicator(drive, {
    discoveryKey: drive.discoveryKey,
    live: true,
    encrypt: false
  })

  swarm.on('peer', function (peer) {
    set.add(peer.host + ':' + peer.port)
  })

  swarm.on('connection', function (connection) {
    connections++
    connection.on('close', function () {
      connections--
    })
  })

  process.once('SIGINT', function () {
    console.log('Caught SIGINT, shutting down the swarm ...')
    server.close()
    swarm.destroy(function () {
      // something else is keeping the process alive so just exit for now
      // todo: investigate what it is
      process.exit(0)
    })
  })

  const server = require('http').createServer(onrequest(drive))
  
  server.once('error', () => server.listen(0))
  server.listen(argv.port)

  server.on('listening', function () {
    console.log(`Server is listening on port http://localhost:${server.address().port}/`)
  })

  setInterval(function () {
    console.log(`Found ${set.size} different peers, connected to ${connections} of them`)
    console.log(`Downloaded ${metadataBlocks} / ${blocks(metadatas)} blocks and ${prettier(metadataBytes)} / ${prettier(bytes(metadatas))} of metadata`)
    console.log(`Downloaded ${contentBlocks} / ${blocks(contents)} blocks and ${prettier(contentBytes)} / ${prettier(bytes(contents))} of content`)
    console.log()
  }, 2000).unref()
})

function bytes (set) {
  let total = 0
  for (const feed of set) total += feed.byteLength
  return total
}

function blocks (set) {
  let total = 0
  for (const feed of set) total += feed.length
  return total
}
