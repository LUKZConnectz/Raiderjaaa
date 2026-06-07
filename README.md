# Raiderjaaa

Static profile page built with Tailwind CSS and connected to the existing profile API.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## API connection

The page calls the existing profile API at `/api/profile` with `credentials: 'include'` so existing cookie/session authentication continues to work. To point the page at a different existing API base URL or endpoint, define `window.__APP_CONFIG__` before loading `src/profile.js`:

```html
<script>
  window.__APP_CONFIG__ = {
    apiBaseUrl: 'https://api.example.com',
    profileEndpoint: '/api/profile'
  };
</script>
```

Supported response shapes are a direct profile object or a wrapped object under `data`, `profile`, or `user`.
