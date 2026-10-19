## Dev sign-in redirect URLs

**Prompt**

````text
[screenshot of newton-dev → Authentication → URL Configuration] missing /auth/callback?
````

````text
I updated and removed the 3rd entry
````

````text
yes tick box
````

**What Claude did**

- Read the screenshot: the Site URL is the dev site, and the redirect URLs were
  `https://heynewton-web.vercel.app/**`, `https://heynewton-*-hey-newton.vercel.app/**` and
  `https://heynewton.app/**`. Explained that `/**` already covers `/auth/callback` on the dev site
  and on previews, so nothing was missing.
- Suggested removing `https://heynewton.app/**` from the dev project: that domain will be the prod
  site, and real boats should only reach prod (#63, #37). It belongs in `newton-prod`'s settings.
  The maintainer removed it.
- Ticked the URL Configuration step in section 5 of decision 0003.

**What changed along the way**

- The tick was meant for #100, which had already merged, so it went in a new PR.

**Pull request:** [#104](https://github.com/heynewton/newton/pull/104)
