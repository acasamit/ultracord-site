# ultracord.dev

The website of [Ultracord](https://github.com/acasamit/ultracord), served by GitHub Pages from
the `main` branch.

Plain HTML, CSS and JavaScript, no build step. The plugin catalog is read at runtime from
`https://assets.ultracord.dev/plugins/index.json`, which the main repository publishes.

## Preview locally

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/`. To preview the catalog with your own data, put a JSON file
next to `index.html` and open `http://localhost:8000/?catalog=./your-file.json` (only honored on
localhost).

## License

Code under GPL-3.0-or-later. The Anton font is under the SIL Open Font License (`fonts/OFL.txt`).
