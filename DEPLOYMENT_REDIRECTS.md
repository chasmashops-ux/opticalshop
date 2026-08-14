Deployment redirect rules — add to your server to enforce preferred domain and avoid redirect chains

Apache (.htaccess)
-------------------
Place this in your site root (public_html) to force https + www and avoid redirect chains:

```
RewriteEngine On
# Redirect non-www to www and force HTTPS
RewriteCond %{HTTP_HOST} !^www\. [NC]
RewriteRule ^ https://www.shreeharichasmaghar.com%{REQUEST_URI} [L,R=301]
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://www.shreeharichasmaghar.com%{REQUEST_URI} [L,R=301]

# Optional: serve pretty URLs (try /services -> /services.html)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^/]+)/?$ $1.html [L]
```

nginx
-----
Add/modify server blocks to force https + www and try_files:

```
server {
    listen 80;
    server_name shreeharichasmaghar.com www.shreeharichasmaghar.com;
    return 301 https://www.shreeharichasmaghar.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.shreeharichasmaghar.com;
    # ssl_certificate ...
    root /path/to/site/root;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }
}
```

Netlify (_redirects)
---------------------
Create `_redirects` at your publish folder root:

```
/* https://www.shreeharichasmaghar.com/:splat 301!
/:splat /:splat.html 200
```

Vercel (vercel.json)
----------------------
Use routes/redirects in `vercel.json` to force hostname and rewrite pretty URLs.

Notes and checklist
- Always use 301 permanent redirects for canonical domain enforcement.
- Avoid redirect chains: user -> non-www -> www -> https should be a single redirect.
- After updating server rules, test several representative URLs with `curl -I` to confirm `HTTP/1.1 301` and `Location:` header point directly to the final URL.
