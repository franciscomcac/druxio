

## Set Up Plerdy Analytics

Add the Plerdy tracking script to all pages of the Duxio site by injecting it into `index.html` before the closing `</body>` tag.

### What is Plerdy?
Plerdy is a heatmap and user behavior analytics tool. Once installed, it will track clicks, scrolls, and user sessions across your entire site automatically.

### Technical Details

**File to modify:** `index.html`

Insert the Plerdy script snippet just before the closing `</body>` tag in `index.html`. Since this is a single-page application, placing it in `index.html` ensures it loads on every route automatically.

The script will be added with the `defer` attribute so it won't block page rendering.

