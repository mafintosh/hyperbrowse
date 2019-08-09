# hyperbrowse

Browse Hyperdrive 10 archives over a localhost http server:

``` sh
npm install -g hyperbrowse
```

The first time you spin it up, pass the Hyperdrive key you want to explore.

This is Wikipedia for example:

``` sh
hyperbrowse -d wiki -k 907c949c372f7281c13330b7bd3feb922a936c4f5ae04e61e34e3c90fc6eba9b
```

Then simply navigate your browser to the address printed (usually http://localhost:8080)
to start browsing.

## Options

- `-k`, `--key`: the hyperdrive 10 key
- `-d`, `--dir`: where to store the data
- `-p`, `--port`: which HTTP port to use.
- `--ram`: ponly use RAM for storage


For more info run `hyperbrowse --help`

## License

MIT
