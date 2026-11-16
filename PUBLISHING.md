# Publish FlyLab 3D

The static site runs on GitHub Pages. The optional review-room relay runs separately as a local Node program. Shared plan files are available in the static site.

## GitHub Pages

1. Sign in to GitHub as `atif-devz` and [create an empty public repository](https://github.com/new) called `FlyLab-3D`. Leave the README, gitignore, and license choices empty. The release ZIP includes the first two files. Choose a project license once redistribution terms are approved.
2. Extract `FlyBio_3D_Source.zip` and open a terminal in the extracted folder. Use Git Credential Manager to authenticate when Git first asks. If Git needs a commit identity, use your public display name and the no-reply email shown in **GitHub Settings → Emails**.

```text
git init -b main
git add .
git commit -m "Release FlyLab 3D"
git remote add origin https://github.com/atif-devz/FlyLab-3D.git
git push -u origin main
```

3. Open the repository **Settings → Pages** and choose **GitHub Actions** under **Build and deployment → Source**. Open **Actions → Deploy FlyLab 3D to GitHub Pages** and run the workflow if the initial push happened before Pages was enabled. Subsequent pushes to `main` run the verification and deploy automatically.
4. Use the production link reported by the workflow to verify the homepage, interactive fly, adult and larval dissection, and a direct link from a module guide. With these account and repository names, the expected address is `https://atif-devz.github.io/FlyLab-3D/`. GitHub determines the actual production URL. The build uses that URL for canonical metadata and the sitemap.

Official setup instructions are in [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Google Search Console

1. After the HTTPS site is live, sign in to [Google Search Console](https://search.google.com/search-console/) and add a **URL-prefix** property for the exact site URL, including the repository path and trailing slash.
2. Select **HTML tag** verification. Copy only the token in the meta tag's `content` attribute into the repository variable `GOOGLE_SITE_VERIFICATION` at **Settings → Secrets and variables → Actions → Variables**. Run the Pages workflow again. Inspect the public homepage HTML for the new meta tag, then click **Verify** in Search Console.
3. In **Sitemaps**, submit `sitemap.xml`. Use **URL Inspection** to test the live homepage and key guide URLs, then request indexing of those pages. Keep the verification tag in place.
4. Check the sitemap and page indexing reports for errors. The repo-path `robots.txt` is included in the published project folder. Google processes crawler rules at the host root, so any host-wide directives must be managed separately by the owner of that root site.

[Google ownership verification](https://support.google.com/webmasters/answer/9008080) · [Google sitemap instructions](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) · [Google URL Inspection](https://support.google.com/webmasters/answer/9012289)

Search Console submission is an owner action after the site goes live. Google controls indexing and ranking.

## Release checks

- Run `node make-portable.mjs FlyBio_3D.html` and `node --experimental-vm-modules verify-portable.mjs FlyBio_3D.html` for the offline application.
- Run `node build-pages.mjs --base https://atif-devz.github.io/FlyLab-3D/` and `node verify-pages.mjs pages-build https://atif-devz.github.io/FlyLab-3D/` for the static site and its crawlable paths.
- On the public HTTPS URL, verify mobile and desktop layouts, WebGL scenes, animation controls, download links, and browser-console errors.
- Review the [asset notices](THIRD_PARTY_NOTICES.md) and select reproduction terms for the project before adding a project-wide license.

