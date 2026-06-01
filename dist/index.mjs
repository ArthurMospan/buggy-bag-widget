"use client";

// src/components/BuggyBag.tsx
import { useState as useState3, useEffect as useEffect3 } from "react";
import { createRoot } from "react-dom/client";

// src/guard.tsx
import React from "react";
import { Fragment, jsx } from "react/jsx-runtime";
function isGodModeActive() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("BUGGY_BAG_ACCESS") === "active";
}
function GodModeGuard({ children }) {
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    setActive(isGodModeActive());
  }, []);
  if (!active) return null;
  return /* @__PURE__ */ jsx(Fragment, { children });
}

// src/components/CaptureMode.tsx
import { useEffect as useEffect2, useState as useState2, useCallback as useCallback2, useRef as useRef2 } from "react";

// node_modules/html-to-image/es/util.js
function resolveUrl(url, baseUrl) {
  if (url.match(/^[a-z]+:\/\//i)) {
    return url;
  }
  if (url.match(/^\/\//)) {
    return window.location.protocol + url;
  }
  if (url.match(/^[a-z]+:/i)) {
    return url;
  }
  const doc = document.implementation.createHTMLDocument();
  const base = doc.createElement("base");
  const a = doc.createElement("a");
  doc.head.appendChild(base);
  doc.body.appendChild(a);
  if (baseUrl) {
    base.href = baseUrl;
  }
  a.href = url;
  return a.href;
}
var uuid = /* @__PURE__ */ (() => {
  let counter = 0;
  const random = () => (
    // eslint-disable-next-line no-bitwise
    `0000${(Math.random() * 36 ** 4 << 0).toString(36)}`.slice(-4)
  );
  return () => {
    counter += 1;
    return `u${random()}${counter}`;
  };
})();
function toArray(arrayLike) {
  const arr = [];
  for (let i = 0, l = arrayLike.length; i < l; i++) {
    arr.push(arrayLike[i]);
  }
  return arr;
}
var styleProps = null;
function getStyleProperties(options = {}) {
  if (styleProps) {
    return styleProps;
  }
  if (options.includeStyleProperties) {
    styleProps = options.includeStyleProperties;
    return styleProps;
  }
  styleProps = toArray(window.getComputedStyle(document.documentElement));
  return styleProps;
}
function px(node, styleProperty) {
  const win = node.ownerDocument.defaultView || window;
  const val = win.getComputedStyle(node).getPropertyValue(styleProperty);
  return val ? parseFloat(val.replace("px", "")) : 0;
}
function getNodeWidth(node) {
  const leftBorder = px(node, "border-left-width");
  const rightBorder = px(node, "border-right-width");
  return node.clientWidth + leftBorder + rightBorder;
}
function getNodeHeight(node) {
  const topBorder = px(node, "border-top-width");
  const bottomBorder = px(node, "border-bottom-width");
  return node.clientHeight + topBorder + bottomBorder;
}
function getImageSize(targetNode, options = {}) {
  const width = options.width || getNodeWidth(targetNode);
  const height = options.height || getNodeHeight(targetNode);
  return { width, height };
}
function getPixelRatio() {
  let ratio;
  let FINAL_PROCESS;
  try {
    FINAL_PROCESS = process;
  } catch (e) {
  }
  const val = FINAL_PROCESS && FINAL_PROCESS.env ? FINAL_PROCESS.env.devicePixelRatio : null;
  if (val) {
    ratio = parseInt(val, 10);
    if (Number.isNaN(ratio)) {
      ratio = 1;
    }
  }
  return ratio || window.devicePixelRatio || 1;
}
var canvasDimensionLimit = 16384;
function checkCanvasDimensions(canvas) {
  if (canvas.width > canvasDimensionLimit || canvas.height > canvasDimensionLimit) {
    if (canvas.width > canvasDimensionLimit && canvas.height > canvasDimensionLimit) {
      if (canvas.width > canvas.height) {
        canvas.height *= canvasDimensionLimit / canvas.width;
        canvas.width = canvasDimensionLimit;
      } else {
        canvas.width *= canvasDimensionLimit / canvas.height;
        canvas.height = canvasDimensionLimit;
      }
    } else if (canvas.width > canvasDimensionLimit) {
      canvas.height *= canvasDimensionLimit / canvas.width;
      canvas.width = canvasDimensionLimit;
    } else {
      canvas.width *= canvasDimensionLimit / canvas.height;
      canvas.height = canvasDimensionLimit;
    }
  }
}
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.decode().then(() => {
        requestAnimationFrame(() => resolve(img));
      });
    };
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = url;
  });
}
async function svgToDataURL(svg) {
  return Promise.resolve().then(() => new XMLSerializer().serializeToString(svg)).then(encodeURIComponent).then((html) => `data:image/svg+xml;charset=utf-8,${html}`);
}
async function nodeToDataURL(node, width, height) {
  const xmlns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(xmlns, "svg");
  const foreignObject = document.createElementNS(xmlns, "foreignObject");
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("externalResourcesRequired", "true");
  svg.appendChild(foreignObject);
  foreignObject.appendChild(node);
  return svgToDataURL(svg);
}
var isInstanceOfElement = (node, instance) => {
  if (node instanceof instance)
    return true;
  const nodePrototype = Object.getPrototypeOf(node);
  if (nodePrototype === null)
    return false;
  return nodePrototype.constructor.name === instance.name || isInstanceOfElement(nodePrototype, instance);
};

// node_modules/html-to-image/es/clone-pseudos.js
function formatCSSText(style) {
  const content = style.getPropertyValue("content");
  return `${style.cssText} content: '${content.replace(/'|"/g, "")}';`;
}
function formatCSSProperties(style, options) {
  return getStyleProperties(options).map((name) => {
    const value = style.getPropertyValue(name);
    const priority = style.getPropertyPriority(name);
    return `${name}: ${value}${priority ? " !important" : ""};`;
  }).join(" ");
}
function getPseudoElementStyle(className, pseudo, style, options) {
  const selector = `.${className}:${pseudo}`;
  const cssText = style.cssText ? formatCSSText(style) : formatCSSProperties(style, options);
  return document.createTextNode(`${selector}{${cssText}}`);
}
function clonePseudoElement(nativeNode, clonedNode, pseudo, options) {
  const style = window.getComputedStyle(nativeNode, pseudo);
  const content = style.getPropertyValue("content");
  if (content === "" || content === "none") {
    return;
  }
  const className = uuid();
  try {
    clonedNode.className = `${clonedNode.className} ${className}`;
  } catch (err) {
    return;
  }
  const styleElement = document.createElement("style");
  styleElement.appendChild(getPseudoElementStyle(className, pseudo, style, options));
  clonedNode.appendChild(styleElement);
}
function clonePseudoElements(nativeNode, clonedNode, options) {
  clonePseudoElement(nativeNode, clonedNode, ":before", options);
  clonePseudoElement(nativeNode, clonedNode, ":after", options);
}

// node_modules/html-to-image/es/mimes.js
var WOFF = "application/font-woff";
var JPEG = "image/jpeg";
var mimes = {
  woff: WOFF,
  woff2: WOFF,
  ttf: "application/font-truetype",
  eot: "application/vnd.ms-fontobject",
  png: "image/png",
  jpg: JPEG,
  jpeg: JPEG,
  gif: "image/gif",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  webp: "image/webp"
};
function getExtension(url) {
  const match = /\.([^./]*?)$/g.exec(url);
  return match ? match[1] : "";
}
function getMimeType(url) {
  const extension = getExtension(url).toLowerCase();
  return mimes[extension] || "";
}

// node_modules/html-to-image/es/dataurl.js
function getContentFromDataUrl(dataURL) {
  return dataURL.split(/,/)[1];
}
function isDataUrl(url) {
  return url.search(/^(data:)/) !== -1;
}
function makeDataUrl(content, mimeType) {
  return `data:${mimeType};base64,${content}`;
}
async function fetchAsDataURL(url, init, process2) {
  const res = await fetch(url, init);
  if (res.status === 404) {
    throw new Error(`Resource "${res.url}" not found`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      try {
        resolve(process2({ res, result: reader.result }));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(blob);
  });
}
var cache = {};
function getCacheKey(url, contentType, includeQueryParams) {
  let key = url.replace(/\?.*/, "");
  if (includeQueryParams) {
    key = url;
  }
  if (/ttf|otf|eot|woff2?/i.test(key)) {
    key = key.replace(/.*\//, "");
  }
  return contentType ? `[${contentType}]${key}` : key;
}
async function resourceToDataURL(resourceUrl, contentType, options) {
  const cacheKey = getCacheKey(resourceUrl, contentType, options.includeQueryParams);
  if (cache[cacheKey] != null) {
    return cache[cacheKey];
  }
  if (options.cacheBust) {
    resourceUrl += (/\?/.test(resourceUrl) ? "&" : "?") + (/* @__PURE__ */ new Date()).getTime();
  }
  let dataURL;
  try {
    const content = await fetchAsDataURL(resourceUrl, options.fetchRequestInit, ({ res, result }) => {
      if (!contentType) {
        contentType = res.headers.get("Content-Type") || "";
      }
      return getContentFromDataUrl(result);
    });
    dataURL = makeDataUrl(content, contentType);
  } catch (error) {
    dataURL = options.imagePlaceholder || "";
    let msg = `Failed to fetch resource: ${resourceUrl}`;
    if (error) {
      msg = typeof error === "string" ? error : error.message;
    }
    if (msg) {
      console.warn(msg);
    }
  }
  cache[cacheKey] = dataURL;
  return dataURL;
}

// node_modules/html-to-image/es/clone-node.js
async function cloneCanvasElement(canvas) {
  const dataURL = canvas.toDataURL();
  if (dataURL === "data:,") {
    return canvas.cloneNode(false);
  }
  return createImage(dataURL);
}
async function cloneVideoElement(video, options) {
  if (video.currentSrc) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx === null || ctx === void 0 ? void 0 : ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL2 = canvas.toDataURL();
    return createImage(dataURL2);
  }
  const poster = video.poster;
  const contentType = getMimeType(poster);
  const dataURL = await resourceToDataURL(poster, contentType, options);
  return createImage(dataURL);
}
async function cloneIFrameElement(iframe, options) {
  var _a;
  try {
    if ((_a = iframe === null || iframe === void 0 ? void 0 : iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.body) {
      return await cloneNode(iframe.contentDocument.body, options, true);
    }
  } catch (_b) {
  }
  return iframe.cloneNode(false);
}
async function cloneSingleNode(node, options) {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement(node);
  }
  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement(node, options);
  }
  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options);
  }
  return node.cloneNode(isSVGElement(node));
}
var isSlotElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SLOT";
var isSVGElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SVG";
async function cloneChildren(nativeNode, clonedNode, options) {
  var _a, _b;
  if (isSVGElement(clonedNode)) {
    return clonedNode;
  }
  let children = [];
  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    children = toArray(nativeNode.assignedNodes());
  } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && ((_a = nativeNode.contentDocument) === null || _a === void 0 ? void 0 : _a.body)) {
    children = toArray(nativeNode.contentDocument.body.childNodes);
  } else {
    children = toArray(((_b = nativeNode.shadowRoot) !== null && _b !== void 0 ? _b : nativeNode).childNodes);
  }
  if (children.length === 0 || isInstanceOfElement(nativeNode, HTMLVideoElement)) {
    return clonedNode;
  }
  await children.reduce((deferred, child) => deferred.then(() => cloneNode(child, options)).then((clonedChild) => {
    if (clonedChild) {
      clonedNode.appendChild(clonedChild);
    }
  }), Promise.resolve());
  return clonedNode;
}
function cloneCSSStyle(nativeNode, clonedNode, options) {
  const targetStyle = clonedNode.style;
  if (!targetStyle) {
    return;
  }
  const sourceStyle = window.getComputedStyle(nativeNode);
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText;
    targetStyle.transformOrigin = sourceStyle.transformOrigin;
  } else {
    getStyleProperties(options).forEach((name) => {
      let value = sourceStyle.getPropertyValue(name);
      if (name === "font-size" && value.endsWith("px")) {
        const reducedFont = Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1;
        value = `${reducedFont}px`;
      }
      if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && name === "display" && value === "inline") {
        value = "block";
      }
      if (name === "d" && clonedNode.getAttribute("d")) {
        value = `path(${clonedNode.getAttribute("d")})`;
      }
      targetStyle.setProperty(name, value, sourceStyle.getPropertyPriority(name));
    });
  }
}
function cloneInputValue(nativeNode, clonedNode) {
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    clonedNode.innerHTML = nativeNode.value;
  }
  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    clonedNode.setAttribute("value", nativeNode.value);
  }
}
function cloneSelectValue(nativeNode, clonedNode) {
  if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
    const clonedSelect = clonedNode;
    const selectedOption = Array.from(clonedSelect.children).find((child) => nativeNode.value === child.getAttribute("value"));
    if (selectedOption) {
      selectedOption.setAttribute("selected", "");
    }
  }
}
function decorate(nativeNode, clonedNode, options) {
  if (isInstanceOfElement(clonedNode, Element)) {
    cloneCSSStyle(nativeNode, clonedNode, options);
    clonePseudoElements(nativeNode, clonedNode, options);
    cloneInputValue(nativeNode, clonedNode);
    cloneSelectValue(nativeNode, clonedNode);
  }
  return clonedNode;
}
async function ensureSVGSymbols(clone, options) {
  const uses = clone.querySelectorAll ? clone.querySelectorAll("use") : [];
  if (uses.length === 0) {
    return clone;
  }
  const processedDefs = {};
  for (let i = 0; i < uses.length; i++) {
    const use = uses[i];
    const id = use.getAttribute("xlink:href");
    if (id) {
      const exist = clone.querySelector(id);
      const definition = document.querySelector(id);
      if (!exist && definition && !processedDefs[id]) {
        processedDefs[id] = await cloneNode(definition, options, true);
      }
    }
  }
  const nodes = Object.values(processedDefs);
  if (nodes.length) {
    const ns = "http://www.w3.org/1999/xhtml";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("xmlns", ns);
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.overflow = "hidden";
    svg.style.display = "none";
    const defs = document.createElementNS(ns, "defs");
    svg.appendChild(defs);
    for (let i = 0; i < nodes.length; i++) {
      defs.appendChild(nodes[i]);
    }
    clone.appendChild(svg);
  }
  return clone;
}
async function cloneNode(node, options, isRoot) {
  if (!isRoot && options.filter && !options.filter(node)) {
    return null;
  }
  return Promise.resolve(node).then((clonedNode) => cloneSingleNode(clonedNode, options)).then((clonedNode) => cloneChildren(node, clonedNode, options)).then((clonedNode) => decorate(node, clonedNode, options)).then((clonedNode) => ensureSVGSymbols(clonedNode, options));
}

// node_modules/html-to-image/es/embed-resources.js
var URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
var URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
var FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
function toRegex(url) {
  const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, "g");
}
function parseURLs(cssText) {
  const urls = [];
  cssText.replace(URL_REGEX, (raw, quotation, url) => {
    urls.push(url);
    return raw;
  });
  return urls.filter((url) => !isDataUrl(url));
}
async function embed(cssText, resourceURL, baseURL, options, getContentFromUrl) {
  try {
    const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL;
    const contentType = getMimeType(resourceURL);
    let dataURL;
    if (getContentFromUrl) {
      const content = await getContentFromUrl(resolvedURL);
      dataURL = makeDataUrl(content, contentType);
    } else {
      dataURL = await resourceToDataURL(resolvedURL, contentType, options);
    }
    return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
  } catch (error) {
  }
  return cssText;
}
function filterPreferredFontFormat(str, { preferredFontFormat }) {
  return !preferredFontFormat ? str : str.replace(FONT_SRC_REGEX, (match) => {
    while (true) {
      const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
      if (!format) {
        return "";
      }
      if (format === preferredFontFormat) {
        return `src: ${src};`;
      }
    }
  });
}
function shouldEmbed(url) {
  return url.search(URL_REGEX) !== -1;
}
async function embedResources(cssText, baseUrl, options) {
  if (!shouldEmbed(cssText)) {
    return cssText;
  }
  const filteredCSSText = filterPreferredFontFormat(cssText, options);
  const urls = parseURLs(filteredCSSText);
  return urls.reduce((deferred, url) => deferred.then((css) => embed(css, url, baseUrl, options)), Promise.resolve(filteredCSSText));
}

// node_modules/html-to-image/es/embed-images.js
async function embedProp(propName, node, options) {
  var _a;
  const propValue = (_a = node.style) === null || _a === void 0 ? void 0 : _a.getPropertyValue(propName);
  if (propValue) {
    const cssString = await embedResources(propValue, null, options);
    node.style.setProperty(propName, cssString, node.style.getPropertyPriority(propName));
    return true;
  }
  return false;
}
async function embedBackground(clonedNode, options) {
  ;
  await embedProp("background", clonedNode, options) || await embedProp("background-image", clonedNode, options);
  await embedProp("mask", clonedNode, options) || await embedProp("-webkit-mask", clonedNode, options) || await embedProp("mask-image", clonedNode, options) || await embedProp("-webkit-mask-image", clonedNode, options);
}
async function embedImageNode(clonedNode, options) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);
  if (!(isImageElement && !isDataUrl(clonedNode.src)) && !(isInstanceOfElement(clonedNode, SVGImageElement) && !isDataUrl(clonedNode.href.baseVal))) {
    return;
  }
  const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;
  const dataURL = await resourceToDataURL(url, getMimeType(url), options);
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve;
    clonedNode.onerror = options.onImageErrorHandler ? (...attributes) => {
      try {
        resolve(options.onImageErrorHandler(...attributes));
      } catch (error) {
        reject(error);
      }
    } : reject;
    const image = clonedNode;
    if (image.decode) {
      image.decode = resolve;
    }
    if (image.loading === "lazy") {
      image.loading = "eager";
    }
    if (isImageElement) {
      clonedNode.srcset = "";
      clonedNode.src = dataURL;
    } else {
      clonedNode.href.baseVal = dataURL;
    }
  });
}
async function embedChildren(clonedNode, options) {
  const children = toArray(clonedNode.childNodes);
  const deferreds = children.map((child) => embedImages(child, options));
  await Promise.all(deferreds).then(() => clonedNode);
}
async function embedImages(clonedNode, options) {
  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(clonedNode, options);
    await embedImageNode(clonedNode, options);
    await embedChildren(clonedNode, options);
  }
}

// node_modules/html-to-image/es/apply-style.js
function applyStyle(node, options) {
  const { style } = node;
  if (options.backgroundColor) {
    style.backgroundColor = options.backgroundColor;
  }
  if (options.width) {
    style.width = `${options.width}px`;
  }
  if (options.height) {
    style.height = `${options.height}px`;
  }
  const manual = options.style;
  if (manual != null) {
    Object.keys(manual).forEach((key) => {
      style[key] = manual[key];
    });
  }
  return node;
}

// node_modules/html-to-image/es/embed-webfonts.js
var cssFetchCache = {};
async function fetchCSS(url) {
  let cache2 = cssFetchCache[url];
  if (cache2 != null) {
    return cache2;
  }
  const res = await fetch(url);
  const cssText = await res.text();
  cache2 = { url, cssText };
  cssFetchCache[url] = cache2;
  return cache2;
}
async function embedFonts(data, options) {
  let cssText = data.cssText;
  const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
  const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
  const loadFonts = fontLocs.map(async (loc) => {
    let url = loc.replace(regexUrl, "$1");
    if (!url.startsWith("https://")) {
      url = new URL(url, data.url).href;
    }
    return fetchAsDataURL(url, options.fetchRequestInit, ({ result }) => {
      cssText = cssText.replace(loc, `url(${result})`);
      return [loc, result];
    });
  });
  return Promise.all(loadFonts).then(() => cssText);
}
function parseCSS(source) {
  if (source == null) {
    return [];
  }
  const result = [];
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
  let cssText = source.replace(commentsRegex, "");
  const keyframesRegex = new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})", "gi");
  while (true) {
    const matches = keyframesRegex.exec(cssText);
    if (matches === null) {
      break;
    }
    result.push(matches[0]);
  }
  cssText = cssText.replace(keyframesRegex, "");
  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
  const combinedCSSRegex = "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})";
  const unifiedRegex = new RegExp(combinedCSSRegex, "gi");
  while (true) {
    let matches = importRegex.exec(cssText);
    if (matches === null) {
      matches = unifiedRegex.exec(cssText);
      if (matches === null) {
        break;
      } else {
        importRegex.lastIndex = unifiedRegex.lastIndex;
      }
    } else {
      unifiedRegex.lastIndex = importRegex.lastIndex;
    }
    result.push(matches[0]);
  }
  return result;
}
async function getCSSRules(styleSheets, options) {
  const ret = [];
  const deferreds = [];
  styleSheets.forEach((sheet) => {
    if ("cssRules" in sheet) {
      try {
        toArray(sheet.cssRules || []).forEach((item, index) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            let importIndex = index + 1;
            const url = item.href;
            const deferred = fetchCSS(url).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
              try {
                sheet.insertRule(rule, rule.startsWith("@import") ? importIndex += 1 : sheet.cssRules.length);
              } catch (error) {
                console.error("Error inserting rule from remote css", {
                  rule,
                  error
                });
              }
            })).catch((e) => {
              console.error("Error loading remote css", e.toString());
            });
            deferreds.push(deferred);
          }
        });
      } catch (e) {
        const inline = styleSheets.find((a) => a.href == null) || document.styleSheets[0];
        if (sheet.href != null) {
          deferreds.push(fetchCSS(sheet.href).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
            inline.insertRule(rule, inline.cssRules.length);
          })).catch((err) => {
            console.error("Error loading remote stylesheet", err);
          }));
        }
        console.error("Error inlining remote css file", e);
      }
    }
  });
  return Promise.all(deferreds).then(() => {
    styleSheets.forEach((sheet) => {
      if ("cssRules" in sheet) {
        try {
          toArray(sheet.cssRules || []).forEach((item) => {
            ret.push(item);
          });
        } catch (e) {
          console.error(`Error while reading CSS rules from ${sheet.href}`, e);
        }
      }
    });
    return ret;
  });
}
function getWebFontRules(cssRules) {
  return cssRules.filter((rule) => rule.type === CSSRule.FONT_FACE_RULE).filter((rule) => shouldEmbed(rule.style.getPropertyValue("src")));
}
async function parseWebFontRules(node, options) {
  if (node.ownerDocument == null) {
    throw new Error("Provided element is not within a Document");
  }
  const styleSheets = toArray(node.ownerDocument.styleSheets);
  const cssRules = await getCSSRules(styleSheets, options);
  return getWebFontRules(cssRules);
}
function normalizeFontFamily(font) {
  return font.trim().replace(/["']/g, "");
}
function getUsedFonts(node) {
  const fonts = /* @__PURE__ */ new Set();
  function traverse(node2) {
    const fontFamily = node2.style.fontFamily || getComputedStyle(node2).fontFamily;
    fontFamily.split(",").forEach((font) => {
      fonts.add(normalizeFontFamily(font));
    });
    Array.from(node2.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        traverse(child);
      }
    });
  }
  traverse(node);
  return fonts;
}
async function getWebFontCSS(node, options) {
  const rules = await parseWebFontRules(node, options);
  const usedFonts = getUsedFonts(node);
  const cssTexts = await Promise.all(rules.filter((rule) => usedFonts.has(normalizeFontFamily(rule.style.fontFamily))).map((rule) => {
    const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null;
    return embedResources(rule.cssText, baseUrl, options);
  }));
  return cssTexts.join("\n");
}
async function embedWebFonts(clonedNode, options) {
  const cssText = options.fontEmbedCSS != null ? options.fontEmbedCSS : options.skipFonts ? null : await getWebFontCSS(clonedNode, options);
  if (cssText) {
    const styleNode = document.createElement("style");
    const sytleContent = document.createTextNode(cssText);
    styleNode.appendChild(sytleContent);
    if (clonedNode.firstChild) {
      clonedNode.insertBefore(styleNode, clonedNode.firstChild);
    } else {
      clonedNode.appendChild(styleNode);
    }
  }
}

// node_modules/html-to-image/es/index.js
async function toSvg(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const clonedNode = await cloneNode(node, options, true);
  await embedWebFonts(clonedNode, options);
  await embedImages(clonedNode, options);
  applyStyle(clonedNode, options);
  const datauri = await nodeToDataURL(clonedNode, width, height);
  return datauri;
}
async function toCanvas(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const svg = await toSvg(node, options);
  const img = await createImage(svg);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const ratio = options.pixelRatio || getPixelRatio();
  const canvasWidth = options.canvasWidth || width;
  const canvasHeight = options.canvasHeight || height;
  canvas.width = canvasWidth * ratio;
  canvas.height = canvasHeight * ratio;
  if (!options.skipAutoScale) {
    checkCanvasDimensions(canvas);
  }
  canvas.style.width = `${canvasWidth}`;
  canvas.style.height = `${canvasHeight}`;
  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
async function toPng(node, options = {}) {
  const canvas = await toCanvas(node, options);
  return canvas.toDataURL();
}

// src/components/DrawingCanvas.tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Arrow, Circle, Text, Group } from "react-konva";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var pinCounter = 1;
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function getStagePos(e) {
  const pos = e.target.getStage()?.getPointerPosition();
  return pos ?? { x: 0, y: 0 };
}
function DrawingCanvas({
  width,
  height,
  tool,
  shapes,
  onShapeComplete
}) {
  const isDrawing = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);
  const handleMouseDown = useCallback(
    (e) => {
      if (e.evt.button !== 0) return;
      const { x, y } = getStagePos(e);
      isDrawing.current = true;
      origin.current = { x, y };
      if (tool === "pin") {
        onShapeComplete({
          id: uid(),
          type: "pin",
          x,
          y,
          pinNumber: pinCounter++
        });
        isDrawing.current = false;
        return;
      }
      const newDraft = {
        id: uid(),
        type: tool,
        x,
        y,
        ...tool === "rect" ? { width: 0, height: 0 } : { points: [x, y, x, y] }
      };
      draftRef.current = newDraft;
      setDraft(newDraft);
    },
    [tool, onShapeComplete]
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing.current || !draftRef.current) return;
      const { x, y } = getStagePos(e);
      let updated = null;
      if (tool === "rect") {
        updated = {
          ...draftRef.current,
          width: x - origin.current.x,
          height: y - origin.current.y
        };
      } else if (tool === "arrow") {
        updated = {
          ...draftRef.current,
          points: [
            origin.current.x,
            origin.current.y,
            x,
            y
          ]
        };
      }
      if (updated) {
        draftRef.current = updated;
        setDraft(updated);
      }
    },
    [tool]
    // draftRef and origin are refs — not needed in deps
  );
  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !draftRef.current) return;
    isDrawing.current = false;
    const current = draftRef.current;
    draftRef.current = null;
    const tooSmall = current.type === "rect" && Math.abs(current.width ?? 0) < 8 && Math.abs(current.height ?? 0) < 8 || current.type === "arrow" && current.points !== void 0 && Math.hypot(
      current.points[2] - current.points[0],
      current.points[3] - current.points[1]
    ) < 8;
    if (!tooSmall) onShapeComplete(current);
    setDraft(null);
  }, [onShapeComplete]);
  const handleMouseLeave = useCallback(() => {
    if (!isDrawing.current || !draftRef.current) return;
    isDrawing.current = false;
    const current = draftRef.current;
    draftRef.current = null;
    const tooSmall = current.type === "rect" && Math.abs(current.width ?? 0) < 8 && Math.abs(current.height ?? 0) < 8 || current.type === "arrow" && current.points !== void 0 && Math.hypot(
      current.points[2] - current.points[0],
      current.points[3] - current.points[1]
    ) < 8;
    if (!tooSmall) onShapeComplete(current);
    setDraft(null);
  }, [onShapeComplete]);
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (isDrawing.current && draftRef.current) {
        isDrawing.current = false;
        const current = draftRef.current;
        draftRef.current = null;
        const tooSmall = current.type === "rect" && Math.abs(current.width ?? 0) < 8 && Math.abs(current.height ?? 0) < 8 || current.type === "arrow" && current.points !== void 0 && Math.hypot(
          current.points[2] - current.points[0],
          current.points[3] - current.points[1]
        ) < 8;
        if (!tooSmall) onShapeComplete(current);
        setDraft(null);
      }
    };
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [onShapeComplete]);
  return /* @__PURE__ */ jsx2(
    Stage,
    {
      width,
      height,
      style: { position: "absolute", top: 0, left: 0, cursor: "crosshair" },
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      children: /* @__PURE__ */ jsxs(Layer, { children: [
        shapes.map(renderShape),
        draft && renderShape(draft)
      ] })
    }
  );
}
function renderShape(s) {
  if (s.type === "rect") {
    return /* @__PURE__ */ jsx2(
      Rect,
      {
        x: s.x,
        y: s.y,
        width: s.width ?? 0,
        height: s.height ?? 0,
        stroke: "#ef4444",
        strokeWidth: 2,
        fill: "rgba(239,68,68,0.08)",
        dash: [6, 3],
        listening: false
      },
      s.id
    );
  }
  if (s.type === "arrow") {
    return /* @__PURE__ */ jsx2(
      Arrow,
      {
        points: s.points ? [...s.points] : [],
        stroke: "#ef4444",
        strokeWidth: 2.5,
        fill: "#ef4444",
        pointerLength: 10,
        pointerWidth: 8,
        listening: false
      },
      s.id
    );
  }
  if (s.type === "pin") {
    return /* @__PURE__ */ jsxs(Group, { x: s.x, y: s.y, listening: false, children: [
      /* @__PURE__ */ jsx2(Circle, { radius: 14, fill: "#ef4444" }),
      /* @__PURE__ */ jsx2(
        Text,
        {
          text: String(s.pinNumber ?? "?"),
          fontSize: 12,
          fontStyle: "bold",
          fill: "white",
          align: "center",
          verticalAlign: "middle",
          x: -14,
          y: -8,
          width: 28,
          height: 16
        }
      )
    ] }, s.id);
  }
  return null;
}

// src/lib/collector.ts
var MAX_NETWORK = 20;
var MAX_CONSOLE = 10;
var MAX_EVENTS = 50;
var EVENT_WINDOW_MS = 3e4;
var networkLog = [];
var consoleLog = [];
var eventLog = [];
function pushCapped(arr, item, max) {
  arr.push(item);
  if (arr.length > max) arr.shift();
}
function recentEvents() {
  const cutoff = Date.now() - EVENT_WINDOW_MS;
  return eventLog.filter((e) => e.timestamp >= cutoff);
}
var fetchPatched = false;
function patchFetch() {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    const start = Date.now();
    try {
      const res = await original(input, init);
      const duration = Date.now() - start;
      const isError = res.status >= 400;
      const entry = {
        url: url.length > 120 ? url.slice(0, 120) + "\u2026" : url,
        method: method.toUpperCase(),
        status: res.status,
        durationMs: duration,
        isError
      };
      pushCapped(networkLog, entry, MAX_NETWORK);
      if (isError) {
        pushCapped(eventLog, {
          type: "network_error",
          description: `${method.toUpperCase()} ${shortUrl(url)} \u2192 ${res.status}`,
          timestamp: Date.now()
        }, MAX_EVENTS);
      }
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      const entry = {
        url: url.length > 120 ? url.slice(0, 120) + "\u2026" : url,
        method: method.toUpperCase(),
        status: 0,
        durationMs: duration,
        isError: true
      };
      pushCapped(networkLog, entry, MAX_NETWORK);
      pushCapped(eventLog, {
        type: "network_error",
        description: `${method.toUpperCase()} ${shortUrl(url)} \u2192 network error`,
        timestamp: Date.now()
      }, MAX_EVENTS);
      throw err;
    }
  };
}
function shortUrl(url) {
  try {
    const u = new URL(url, window.location.href);
    return u.pathname + (u.search || "");
  } catch {
    return url.slice(0, 60);
  }
}
var consolePaetched = false;
function patchConsole() {
  if (consolePaetched || typeof window === "undefined") return;
  consolePaetched = true;
  const levels = ["error", "warn"];
  levels.forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      const message = args.map((a) => {
        if (typeof a === "string") return a;
        if (a instanceof Error) return `${a.message}`;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }).join(" ").slice(0, 200);
      const entry = { level, message };
      const stack = new Error().stack ?? "";
      const match = stack.split("\n").find((l) => !l.includes("collector") && l.includes(".tsx"));
      if (match) {
        const fileMatch = match.match(/([^/\\]+\.tsx?:\d+)/);
        if (fileMatch) entry.source = fileMatch[1];
      }
      pushCapped(consoleLog, entry, MAX_CONSOLE);
      if (level === "error") {
        pushCapped(eventLog, {
          type: "console_error",
          description: message.slice(0, 100),
          timestamp: Date.now()
        }, MAX_EVENTS);
      }
    };
  });
}
var domPatched = false;
function patchDom() {
  if (domPatched || typeof window === "undefined") return;
  domPatched = true;
  const pushState = history.pushState.bind(history);
  history.pushState = function(...args) {
    pushState(...args);
    pushCapped(eventLog, {
      type: "navigation",
      description: `Navigated to ${window.location.pathname}`,
      timestamp: Date.now()
    }, MAX_EVENTS);
  };
  window.addEventListener("popstate", () => {
    pushCapped(eventLog, {
      type: "navigation",
      description: `Back/forward to ${window.location.pathname}`,
      timestamp: Date.now()
    }, MAX_EVENTS);
  });
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;
    const el = target.closest('button, a, [role="button"]');
    if (!el) return;
    if (el.closest("[data-buggy-bag]")) return;
    const label = el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || el.tagName.toLowerCase();
    pushCapped(eventLog, {
      type: "click",
      description: `Clicked "${label}"`,
      timestamp: Date.now()
    }, MAX_EVENTS);
  }, { capture: true, passive: true });
}
function findReactComponent(element) {
  if (!element) return null;
  let el = element;
  while (el) {
    const fiberKey = Object.keys(el).find(
      (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance")
    );
    if (fiberKey) {
      let fiber = el[fiberKey];
      while (fiber) {
        const name = fiber.type?.displayName || fiber.type?.name || fiber.elementType?.displayName || fiber.elementType?.name;
        if (name && name !== "div" && !name.startsWith("_") && name.length > 1) {
          const rawProps = fiber.memoizedProps ?? {};
          const props = {};
          for (const [k, v] of Object.entries(rawProps)) {
            if (k === "children" || typeof v === "function") continue;
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
              props[k] = v;
            }
          }
          return { name, props: Object.keys(props).length ? props : void 0 };
        }
        fiber = fiber.return;
      }
    }
    el = el.parentElement;
  }
  return null;
}
function readStoreSnapshot() {
  if (typeof window === "undefined") return null;
  const w = window;
  const candidates = ["__store", "__zustandStore", "store", "__appStore"];
  for (const key of candidates) {
    if (w[key] && typeof w[key].getState === "function") {
      try {
        const state = w[key].getState();
        return sanitizeSnapshot(state);
      } catch {
      }
    }
  }
  if (w.__REDUX_DEVTOOLS_EXTENSION__) {
    try {
      const store = w.__REDUX_STORE__;
      if (store?.getState) return sanitizeSnapshot(store.getState());
    } catch {
    }
  }
  return null;
}
function sanitizeSnapshot(state, depth = 0) {
  if (depth > 2 || typeof state !== "object" || state === null) return {};
  const result = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v === "function") continue;
    if (/password|token|secret|key|auth|credential/i.test(k)) {
      result[k] = "***";
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      result[k] = v;
    } else if (typeof v === "object") {
      const nested = sanitizeSnapshot(v, depth + 1);
      if (Object.keys(nested).length) result[k] = nested;
    }
  }
  return result;
}
function calcAutoSeverity(network, console_) {
  const has5xx = network.some((r) => r.status >= 500);
  const has4xx = network.some((r) => r.status >= 400 && r.status < 500);
  const hasConsoleError = console_.some((c) => c.level === "error");
  if (has5xx) return "critical";
  if (has4xx && hasConsoleError) return "high";
  if (has4xx || hasConsoleError) return "medium";
  return "low";
}
function initCollector() {
  patchFetch();
  patchConsole();
  patchDom();
  pushCapped(eventLog, {
    type: "navigation",
    description: `Opened ${window.location.pathname}`,
    timestamp: Date.now()
  }, MAX_EVENTS);
}
function collectTechContext(clickedElement) {
  const network = [...networkLog];
  const console_ = [...consoleLog];
  const events = recentEvents();
  const component = findReactComponent(clickedElement ?? null);
  const storeSnapshot = readStoreSnapshot();
  return {
    route: window.location.pathname + window.location.search,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    component,
    storeSnapshot,
    networkRequests: network,
    consoleErrors: console_,
    eventLog: events,
    autoSeverity: calcAutoSeverity(network, console_)
  };
}

// src/components/CaptureMode.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function ToolBtn({ active, onClick, title, children }) {
  return /* @__PURE__ */ jsx3("button", { type: "button", onClick, title, style: { width: "34px", height: "34px", borderRadius: "8px", background: active ? "#1f1f1f" : "transparent", border: "none", cursor: "pointer", color: active ? "white" : "#9a9a9a", display: "flex", alignItems: "center", justifyContent: "center" }, children });
}
function CaptureMode({ initialTool, apiKey, onSend, onCancel }) {
  const [screenshotUrl, setScreenshotUrl] = useState2(null);
  const [tool, setTool] = useState2(initialTool);
  const [shapes, setShapes] = useState2([]);
  const [description, setDescription] = useState2("");
  const [showSendPanel, setShowSendPanel] = useState2(false);
  const techContextRef = useRef2(collectTechContext());
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  useEffect2(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const dataUrl = await toPng(document.body, {
          filter: (el) => el.getAttribute?.("data-buggy-bag") !== "true",
          width: window.innerWidth,
          height: window.innerHeight,
          pixelRatio: 1,
          skipFonts: true
        });
        if (!cancelled) setScreenshotUrl(dataUrl);
      } catch (err) {
        console.error("[BuggyBag] screenshot failed:", err);
        if (!cancelled) onCancel();
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onCancel]);
  const handleShapeComplete = useCallback2((shape) => {
    setShapes((prev) => [...prev, shape]);
  }, []);
  const handleSend = useCallback2(() => {
    if (!screenshotUrl) return;
    onSend({
      api_key: apiKey,
      base64_image: screenshotUrl,
      shapes,
      annotations: {},
      description: description.trim() || "\u0411\u0435\u0437 \u043E\u043F\u0438\u0441\u0443",
      tech_context: techContextRef.current
    });
  }, [screenshotUrl, shapes, description, apiKey, onSend]);
  return /* @__PURE__ */ jsxs2("div", { "data-buggy-bag": "true", style: { position: "fixed", inset: 0, zIndex: 1e4, userSelect: "none" }, children: [
    screenshotUrl ? /* @__PURE__ */ jsx3("img", { src: screenshotUrl, alt: "screenshot", style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }, draggable: false }) : /* @__PURE__ */ jsxs2("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px" }, children: [
      /* @__PURE__ */ jsx3("span", { style: { color: "rgba(255,255,255,0.9)", fontSize: "15px", fontWeight: "600" }, children: "\u23F8 \u0417\u0430\u043C\u043E\u0440\u043E\u0436\u0443\u044E \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443..." }),
      /* @__PURE__ */ jsx3("span", { style: { color: "rgba(255,255,255,0.4)", fontSize: "12px" }, children: "\u0417\u0431\u0438\u0440\u0430\u044E \u0442\u0435\u0445\u043D\u0456\u0447\u043D\u0438\u0439 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442" })
    ] }),
    screenshotUrl && !showSendPanel && /* @__PURE__ */ jsx3(DrawingCanvas, { width: w, height: h, tool, shapes, onShapeComplete: handleShapeComplete }),
    screenshotUrl && !showSendPanel && /* @__PURE__ */ jsxs2("div", { "data-buggy-bag": "true", style: { position: "fixed", bottom: "24px", right: "24px", background: "white", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", padding: "8px", display: "flex", alignItems: "center", gap: "4px" }, children: [
      /* @__PURE__ */ jsx3(ToolBtn, { active: tool === "rect", onClick: () => setTool("rect"), title: "\u041E\u0431\u043B\u0430\u0441\u0442\u044C", children: /* @__PURE__ */ jsx3("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsx3("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }) }) }),
      /* @__PURE__ */ jsx3(ToolBtn, { active: tool === "arrow", onClick: () => setTool("arrow"), title: "\u0421\u0442\u0440\u0456\u043B\u043A\u0430", children: /* @__PURE__ */ jsxs2("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsx3("path", { d: "M5 19L19 5" }),
        /* @__PURE__ */ jsx3("path", { d: "M8 5h11v11" })
      ] }) }),
      /* @__PURE__ */ jsx3(ToolBtn, { active: tool === "pin", onClick: () => setTool("pin"), title: "\u041F\u0456\u043D", children: /* @__PURE__ */ jsxs2("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsx3("path", { d: "M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" }),
        /* @__PURE__ */ jsx3("circle", { cx: "12", cy: "10", r: "2.5" })
      ] }) }),
      /* @__PURE__ */ jsx3("div", { style: { width: "1px", height: "20px", background: "#e9e9e9", margin: "0 2px" } }),
      /* @__PURE__ */ jsx3("button", { type: "button", onClick: () => setShowSendPanel(true), style: { height: "32px", padding: "0 14px", borderRadius: "8px", background: "#1f1f1f", color: "white", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700" }, children: "\u0414\u0430\u043B\u0456 \u2192" }),
      /* @__PURE__ */ jsx3("button", { type: "button", onClick: onCancel, style: { height: "32px", padding: "0 10px", borderRadius: "8px", background: "transparent", color: "#9a9a9a", border: "none", cursor: "pointer", fontSize: "14px" }, children: "\u2715" })
    ] }),
    screenshotUrl && showSendPanel && /* @__PURE__ */ jsx3("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "24px" }, children: /* @__PURE__ */ jsxs2("div", { style: { width: "100%", maxWidth: "480px", margin: "0 16px", background: "#1c1c1e", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", padding: "16px" }, children: [
      /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }, children: [
        /* @__PURE__ */ jsx3("span", { style: { fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }, children: techContextRef.current.route }),
        techContextRef.current.component && /* @__PURE__ */ jsx3("span", { style: { fontSize: "10px", fontFamily: "monospace", color: "#a5b4fc", background: "rgba(99,102,241,0.15)", padding: "2px 8px", borderRadius: "4px" }, children: techContextRef.current.component.name }),
        techContextRef.current.networkRequests.filter((r) => r.isError).slice(0, 2).map((r, i) => /* @__PURE__ */ jsxs2("span", { style: { fontSize: "10px", fontFamily: "monospace", color: "#fca5a5", background: "rgba(239,68,68,0.15)", padding: "2px 8px", borderRadius: "4px" }, children: [
          r.status,
          " ",
          r.url.split("/").slice(-1)[0]
        ] }, i)),
        techContextRef.current.consoleErrors.length > 0 && /* @__PURE__ */ jsxs2("span", { style: { fontSize: "10px", color: "#fcd34d", background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: "4px" }, children: [
          techContextRef.current.consoleErrors.length,
          " console error"
        ] })
      ] }),
      /* @__PURE__ */ jsx3(
        "textarea",
        {
          value: description,
          onChange: (e) => setDescription(e.target.value),
          placeholder: "\u041E\u043F\u0438\u0448\u0456\u0442\u044C \u0449\u043E \u043D\u0435 \u0442\u0430\u043A...",
          autoFocus: true,
          rows: 3,
          style: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", color: "white", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }
        }
      ),
      techContextRef.current.eventLog.length > 0 && /* @__PURE__ */ jsxs2("div", { style: { marginTop: "10px" }, children: [
        /* @__PURE__ */ jsx3("div", { style: { fontSize: "10px", fontWeight: "700", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }, children: "\u041A\u0440\u043E\u043A\u0438 \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F (\u0430\u0432\u0442\u043E)" }),
        /* @__PURE__ */ jsx3("div", { style: { background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "7px 10px", maxHeight: "72px", overflowY: "auto" }, children: techContextRef.current.eventLog.slice(-5).map((e, i) => /* @__PURE__ */ jsxs2("div", { style: { fontSize: "11px", fontFamily: "monospace", color: e.type === "console_error" || e.type === "network_error" ? "#fca5a5" : "rgba(255,255,255,0.4)", lineHeight: "1.6" }, children: [
          i + 1,
          ". ",
          e.description
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: "8px", marginTop: "10px" }, children: [
        /* @__PURE__ */ jsx3("button", { type: "button", onClick: () => setShowSendPanel(false), style: { padding: "9px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)" }, children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }),
        /* @__PURE__ */ jsx3("button", { type: "button", onClick: onCancel, style: { padding: "9px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)" }, children: "\u2715" }),
        /* @__PURE__ */ jsx3("button", { type: "button", onClick: handleSend, style: { flex: 1, padding: "9px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", background: "#4f46e5", color: "white", border: "none", cursor: "pointer" }, children: "\u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u043D\u0430 \u043F\u043E\u0440\u0442\u0430\u043B \u2192" })
      ] })
    ] }) })
  ] });
}

// src/styles.gen.ts
var styles = '.container {\n    width: 100%\n}\n@media (min-width: 640px) {\n    .container {\n        max-width: 640px\n    }\n}\n@media (min-width: 768px) {\n    .container {\n        max-width: 768px\n    }\n}\n@media (min-width: 1024px) {\n    .container {\n        max-width: 1024px\n    }\n}\n@media (min-width: 1280px) {\n    .container {\n        max-width: 1280px\n    }\n}\n@media (min-width: 1536px) {\n    .container {\n        max-width: 1536px\n    }\n}\n.sr-only {\n    position: absolute;\n    width: 1px;\n    height: 1px;\n    padding: 0;\n    margin: -1px;\n    overflow: hidden;\n    clip: rect(0, 0, 0, 0);\n    white-space: nowrap;\n    border-width: 0\n}\n.pointer-events-none {\n    pointer-events: none\n}\n.visible {\n    visibility: visible\n}\n.fixed {\n    position: fixed\n}\n.absolute {\n    position: absolute\n}\n.relative {\n    position: relative\n}\n.inset-0 {\n    inset: 0px\n}\n.-right-1 {\n    right: -0.25rem\n}\n.-top-1 {\n    top: -0.25rem\n}\n.bottom-24 {\n    bottom: 6rem\n}\n.bottom-6 {\n    bottom: 1.5rem\n}\n.left-1 {\n    left: 0.25rem\n}\n.left-\\[12px\\] {\n    left: 12px\n}\n.right-6 {\n    right: 1.5rem\n}\n.top-1 {\n    top: 0.25rem\n}\n.top-1\\/2 {\n    top: 50%\n}\n.top-4 {\n    top: 1rem\n}\n.z-\\[10002\\] {\n    z-index: 10002\n}\n.z-\\[9998\\] {\n    z-index: 9998\n}\n.mx-1 {\n    margin-left: 0.25rem;\n    margin-right: 0.25rem\n}\n.mx-4 {\n    margin-left: 1rem;\n    margin-right: 1rem\n}\n.mx-auto {\n    margin-left: auto;\n    margin-right: auto\n}\n.mb-1 {\n    margin-bottom: 0.25rem\n}\n.mb-2 {\n    margin-bottom: 0.5rem\n}\n.mb-3 {\n    margin-bottom: 0.75rem\n}\n.mb-4 {\n    margin-bottom: 1rem\n}\n.mb-6 {\n    margin-bottom: 1.5rem\n}\n.ml-1 {\n    margin-left: 0.25rem\n}\n.mt-0 {\n    margin-top: 0px\n}\n.mt-1 {\n    margin-top: 0.25rem\n}\n.mt-2 {\n    margin-top: 0.5rem\n}\n.mt-6 {\n    margin-top: 1.5rem\n}\n.line-clamp-2 {\n    overflow: hidden;\n    display: -webkit-box;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 2\n}\n.block {\n    display: block\n}\n.flex {\n    display: flex\n}\n.inline-flex {\n    display: inline-flex\n}\n.hidden {\n    display: none\n}\n.h-10 {\n    height: 2.5rem\n}\n.h-12 {\n    height: 3rem\n}\n.h-6 {\n    height: 1.5rem\n}\n.h-\\[28px\\] {\n    height: 28px\n}\n.h-\\[32px\\] {\n    height: 32px\n}\n.h-\\[36px\\] {\n    height: 36px\n}\n.h-full {\n    height: 100%\n}\n.max-h-\\[calc\\(100vh-200px\\)\\] {\n    max-height: calc(100vh - 200px)\n}\n.w-10 {\n    width: 2.5rem\n}\n.w-12 {\n    width: 3rem\n}\n.w-\\[288px\\] {\n    width: 288px\n}\n.w-\\[32px\\] {\n    width: 32px\n}\n.w-\\[36px\\] {\n    width: 36px\n}\n.w-full {\n    width: 100%\n}\n.w-px {\n    width: 1px\n}\n.min-w-0 {\n    min-width: 0px\n}\n.max-w-\\[1200px\\] {\n    max-width: 1200px\n}\n.max-w-\\[480px\\] {\n    max-width: 480px\n}\n.max-w-\\[640px\\] {\n    max-width: 640px\n}\n.max-w-\\[900px\\] {\n    max-width: 900px\n}\n.flex-1 {\n    flex: 1 1 0%\n}\n.flex-shrink {\n    flex-shrink: 1\n}\n.shrink-0 {\n    flex-shrink: 0\n}\n.-translate-x-1 {\n    --tw-translate-x: -0.25rem;\n    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))\n}\n.-translate-y-1 {\n    --tw-translate-y: -0.25rem;\n    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))\n}\n.-translate-y-1\\/2 {\n    --tw-translate-y: -50%;\n    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))\n}\n.transform {\n    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))\n}\n@keyframes pulse {\n    50% {\n        opacity: .5\n    }\n}\n.animate-pulse {\n    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite\n}\n@keyframes spin {\n    to {\n        transform: rotate(360deg)\n    }\n}\n.animate-spin {\n    animation: spin 1s linear infinite\n}\n.cursor-default {\n    cursor: default\n}\n.select-none {\n    -webkit-user-select: none;\n       -moz-user-select: none;\n            user-select: none\n}\n.resize-none {\n    resize: none\n}\n.resize {\n    resize: both\n}\n.flex-col {\n    flex-direction: column\n}\n.flex-wrap {\n    flex-wrap: wrap\n}\n.items-start {\n    align-items: flex-start\n}\n.items-end {\n    align-items: flex-end\n}\n.items-center {\n    align-items: center\n}\n.justify-center {\n    justify-content: center\n}\n.justify-between {\n    justify-content: space-between\n}\n.gap-1 {\n    gap: 0.25rem\n}\n.gap-2 {\n    gap: 0.5rem\n}\n.gap-3 {\n    gap: 0.75rem\n}\n.gap-4 {\n    gap: 1rem\n}\n.gap-\\[6px\\] {\n    gap: 6px\n}\n.self-start {\n    align-self: flex-start\n}\n.overflow-hidden {\n    overflow: hidden\n}\n.overflow-y-auto {\n    overflow-y: auto\n}\n.rounded {\n    border-radius: 0.25rem\n}\n.rounded-\\[10px\\] {\n    border-radius: 10px\n}\n.rounded-\\[16px\\] {\n    border-radius: 16px\n}\n.rounded-\\[24px\\] {\n    border-radius: 24px\n}\n.rounded-\\[8px\\] {\n    border-radius: 8px\n}\n.rounded-full {\n    border-radius: 9999px\n}\n.border {\n    border-width: 1px\n}\n.border-2 {\n    border-width: 2px\n}\n.border-b {\n    border-bottom-width: 1px\n}\n.border-t {\n    border-top-width: 1px\n}\n.border-\\[\\#f0f0f0\\] {\n    --tw-border-opacity: 1;\n    border-color: rgb(240 240 240 / var(--tw-border-opacity, 1))\n}\n.border-red-500 {\n    --tw-border-opacity: 1;\n    border-color: rgb(239 68 68 / var(--tw-border-opacity, 1))\n}\n.border-transparent {\n    border-color: transparent\n}\n.border-white {\n    --tw-border-opacity: 1;\n    border-color: rgb(255 255 255 / var(--tw-border-opacity, 1))\n}\n.bg-\\[\\#1f1f1f\\] {\n    --tw-bg-opacity: 1;\n    background-color: rgb(31 31 31 / var(--tw-bg-opacity, 1))\n}\n.bg-\\[\\#ef4444\\] {\n    --tw-bg-opacity: 1;\n    background-color: rgb(239 68 68 / var(--tw-bg-opacity, 1))\n}\n.bg-\\[\\#f0f0f0\\] {\n    --tw-bg-opacity: 1;\n    background-color: rgb(240 240 240 / var(--tw-bg-opacity, 1))\n}\n.bg-\\[\\#f4f4f5\\] {\n    --tw-bg-opacity: 1;\n    background-color: rgb(244 244 245 / var(--tw-bg-opacity, 1))\n}\n.bg-\\[\\#f5f5f5\\] {\n    --tw-bg-opacity: 1;\n    background-color: rgb(245 245 245 / var(--tw-bg-opacity, 1))\n}\n.bg-amber-500 {\n    --tw-bg-opacity: 1;\n    background-color: rgb(245 158 11 / var(--tw-bg-opacity, 1))\n}\n.bg-black {\n    --tw-bg-opacity: 1;\n    background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1))\n}\n.bg-black\\/40 {\n    background-color: rgb(0 0 0 / 0.4)\n}\n.bg-indigo-500 {\n    --tw-bg-opacity: 1;\n    background-color: rgb(99 102 241 / var(--tw-bg-opacity, 1))\n}\n.bg-red-50 {\n    --tw-bg-opacity: 1;\n    background-color: rgb(254 242 242 / var(--tw-bg-opacity, 1))\n}\n.bg-red-500 {\n    --tw-bg-opacity: 1;\n    background-color: rgb(239 68 68 / var(--tw-bg-opacity, 1))\n}\n.bg-transparent {\n    background-color: transparent\n}\n.bg-white {\n    --tw-bg-opacity: 1;\n    background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1))\n}\n.object-contain {\n    -o-object-fit: contain;\n       object-fit: contain\n}\n.object-cover {\n    -o-object-fit: cover;\n       object-fit: cover\n}\n.p-0 {\n    padding: 0px\n}\n.p-1 {\n    padding: 0.25rem\n}\n.p-3 {\n    padding: 0.75rem\n}\n.p-4 {\n    padding: 1rem\n}\n.p-\\[10px\\] {\n    padding: 10px\n}\n.p-\\[12px\\] {\n    padding: 12px\n}\n.p-\\[16px\\] {\n    padding: 16px\n}\n.p-\\[20px\\] {\n    padding: 20px\n}\n.p-\\[24px\\] {\n    padding: 24px\n}\n.px-1 {\n    padding-left: 0.25rem;\n    padding-right: 0.25rem\n}\n.px-2 {\n    padding-left: 0.5rem;\n    padding-right: 0.5rem\n}\n.px-3 {\n    padding-left: 0.75rem;\n    padding-right: 0.75rem\n}\n.px-4 {\n    padding-left: 1rem;\n    padding-right: 1rem\n}\n.px-6 {\n    padding-left: 1.5rem;\n    padding-right: 1.5rem\n}\n.px-\\[12px\\] {\n    padding-left: 12px;\n    padding-right: 12px\n}\n.px-\\[16px\\] {\n    padding-left: 16px;\n    padding-right: 16px\n}\n.px-\\[18px\\] {\n    padding-left: 18px;\n    padding-right: 18px\n}\n.py-0 {\n    padding-top: 0px;\n    padding-bottom: 0px\n}\n.py-12 {\n    padding-top: 3rem;\n    padding-bottom: 3rem\n}\n.py-2 {\n    padding-top: 0.5rem;\n    padding-bottom: 0.5rem\n}\n.py-3 {\n    padding-top: 0.75rem;\n    padding-bottom: 0.75rem\n}\n.py-5 {\n    padding-top: 1.25rem;\n    padding-bottom: 1.25rem\n}\n.py-8 {\n    padding-top: 2rem;\n    padding-bottom: 2rem\n}\n.pb-2 {\n    padding-bottom: 0.5rem\n}\n.pb-3 {\n    padding-bottom: 0.75rem\n}\n.pb-4 {\n    padding-bottom: 1rem\n}\n.pb-6 {\n    padding-bottom: 1.5rem\n}\n.pl-\\[12px\\] {\n    padding-left: 12px\n}\n.pl-\\[36px\\] {\n    padding-left: 36px\n}\n.pr-\\[12px\\] {\n    padding-right: 12px\n}\n.pt-12 {\n    padding-top: 3rem\n}\n.pt-3 {\n    padding-top: 0.75rem\n}\n.pt-4 {\n    padding-top: 1rem\n}\n.pt-6 {\n    padding-top: 1.5rem\n}\n.text-center {\n    text-align: center\n}\n.font-mono {\n    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace\n}\n.text-\\[11px\\] {\n    font-size: 11px\n}\n.text-\\[12px\\] {\n    font-size: 12px\n}\n.text-\\[13px\\] {\n    font-size: 13px\n}\n.text-\\[18px\\] {\n    font-size: 18px\n}\n.font-bold {\n    font-weight: 700\n}\n.font-semibold {\n    font-weight: 600\n}\n.uppercase {\n    text-transform: uppercase\n}\n.italic {\n    font-style: italic\n}\n.leading-none {\n    line-height: 1\n}\n.leading-relaxed {\n    line-height: 1.625\n}\n.leading-snug {\n    line-height: 1.375\n}\n.tracking-wider {\n    letter-spacing: 0.05em\n}\n.text-\\[\\#1f1f1f\\] {\n    --tw-text-opacity: 1;\n    color: rgb(31 31 31 / var(--tw-text-opacity, 1))\n}\n.text-\\[\\#9a9a9a\\] {\n    --tw-text-opacity: 1;\n    color: rgb(154 154 154 / var(--tw-text-opacity, 1))\n}\n.text-\\[\\#ef4444\\] {\n    --tw-text-opacity: 1;\n    color: rgb(239 68 68 / var(--tw-text-opacity, 1))\n}\n.text-amber-300 {\n    --tw-text-opacity: 1;\n    color: rgb(252 211 77 / var(--tw-text-opacity, 1))\n}\n.text-indigo-300 {\n    --tw-text-opacity: 1;\n    color: rgb(165 180 252 / var(--tw-text-opacity, 1))\n}\n.text-red-300 {\n    --tw-text-opacity: 1;\n    color: rgb(252 165 165 / var(--tw-text-opacity, 1))\n}\n.text-white {\n    --tw-text-opacity: 1;\n    color: rgb(255 255 255 / var(--tw-text-opacity, 1))\n}\n.opacity-60 {\n    opacity: 0.6\n}\n.shadow {\n    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);\n    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)\n}\n.shadow-\\[0_25px_50px_rgba\\(0\\2c 0\\2c 0\\2c 0\\.15\\)\\] {\n    --tw-shadow: 0 25px 50px rgba(0,0,0,0.15);\n    --tw-shadow-colored: 0 25px 50px var(--tw-shadow-color);\n    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)\n}\n.shadow-\\[0_8px_32px_rgba\\(0\\2c 0\\2c 0\\2c 0\\.22\\)\\] {\n    --tw-shadow: 0 8px 32px rgba(0,0,0,0.22);\n    --tw-shadow-colored: 0 8px 32px var(--tw-shadow-color);\n    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)\n}\n.shadow-lg {\n    --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);\n    --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);\n    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)\n}\n.shadow-sm {\n    --tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);\n    --tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);\n    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)\n}\n.outline-none {\n    outline: 2px solid transparent;\n    outline-offset: 2px\n}\n.outline {\n    outline-style: solid\n}\n.blur {\n    --tw-blur: blur(8px);\n    filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)\n}\n.filter {\n    filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)\n}\n.backdrop-blur-sm {\n    --tw-backdrop-blur: blur(4px);\n    backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)\n}\n.backdrop-filter {\n    backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)\n}\n.transition {\n    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;\n    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n    transition-duration: 150ms\n}\n.transition-all {\n    transition-property: all;\n    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n    transition-duration: 150ms\n}\n.transition-colors {\n    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;\n    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n    transition-duration: 150ms\n}\n.duration-150 {\n    transition-duration: 150ms\n}\n.placeholder\\:text-\\[\\#a3a3a3\\]::-moz-placeholder {\n    --tw-text-opacity: 1;\n    color: rgb(163 163 163 / var(--tw-text-opacity, 1))\n}\n.placeholder\\:text-\\[\\#a3a3a3\\]::placeholder {\n    --tw-text-opacity: 1;\n    color: rgb(163 163 163 / var(--tw-text-opacity, 1))\n}\n.hover\\:bg-\\[\\#303030\\]:hover {\n    --tw-bg-opacity: 1;\n    background-color: rgb(48 48 48 / var(--tw-bg-opacity, 1))\n}\n.hover\\:bg-\\[\\#dc2626\\]:hover {\n    --tw-bg-opacity: 1;\n    background-color: rgb(220 38 38 / var(--tw-bg-opacity, 1))\n}\n.hover\\:bg-\\[\\#e9e9e9\\]:hover {\n    --tw-bg-opacity: 1;\n    background-color: rgb(233 233 233 / var(--tw-bg-opacity, 1))\n}\n.hover\\:bg-\\[\\#ebebeb\\]:hover {\n    --tw-bg-opacity: 1;\n    background-color: rgb(235 235 235 / var(--tw-bg-opacity, 1))\n}\n.hover\\:bg-\\[\\#f0f0f0\\]:hover {\n    --tw-bg-opacity: 1;\n    background-color: rgb(240 240 240 / var(--tw-bg-opacity, 1))\n}\n.hover\\:bg-\\[\\#f4f4f5\\]:hover {\n    --tw-bg-opacity: 1;\n    background-color: rgb(244 244 245 / var(--tw-bg-opacity, 1))\n}\n.hover\\:text-\\[\\#1f1f1f\\]:hover {\n    --tw-text-opacity: 1;\n    color: rgb(31 31 31 / var(--tw-text-opacity, 1))\n}\n.focus\\:border-\\[\\#1f1f1f\\]:focus {\n    --tw-border-opacity: 1;\n    border-color: rgb(31 31 31 / var(--tw-border-opacity, 1))\n}\n.focus\\:outline-none:focus {\n    outline: 2px solid transparent;\n    outline-offset: 2px\n}\n.disabled\\:cursor-not-allowed:disabled {\n    cursor: not-allowed\n}\n.disabled\\:opacity-50:disabled {\n    opacity: 0.5\n}\n';
var styles_gen_default = styles;

// src/components/BuggyBag.tsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function RectIcon() {
  return /* @__PURE__ */ jsx4("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx4("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }) });
}
function ArrowIcon() {
  return /* @__PURE__ */ jsxs3("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx4("path", { d: "M5 19L19 5" }),
    /* @__PURE__ */ jsx4("path", { d: "M8 5h11v11" })
  ] });
}
function PinIcon() {
  return /* @__PURE__ */ jsxs3("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx4("path", { d: "M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" }),
    /* @__PURE__ */ jsx4("circle", { cx: "12", cy: "10", r: "3" })
  ] });
}
function BugIcon() {
  return /* @__PURE__ */ jsxs3("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx4("path", { d: "M8 2l1.88 1.88" }),
    /* @__PURE__ */ jsx4("path", { d: "M14.12 3.88L16 2" }),
    /* @__PURE__ */ jsx4("path", { d: "M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" }),
    /* @__PURE__ */ jsx4("path", { d: "M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" }),
    /* @__PURE__ */ jsx4("path", { d: "M12 20v-9" }),
    /* @__PURE__ */ jsx4("path", { d: "M6.53 9C4.6 8.8 3 7 3 5" }),
    /* @__PURE__ */ jsx4("path", { d: "M6 13H2" }),
    /* @__PURE__ */ jsx4("path", { d: "M3 21c0-2.1 1.7-3.9 3.8-4" }),
    /* @__PURE__ */ jsx4("path", { d: "M20.97 5c0 2.1-1.6 3.8-3.5 4" }),
    /* @__PURE__ */ jsx4("path", { d: "M22 13h-4" }),
    /* @__PURE__ */ jsx4("path", { d: "M17.2 17c2.1.1 3.8 1.9 3.8 4" })
  ] });
}
function BuggyBagInner({ apiEndpoint, apiKey, portalUrl }) {
  const [expanded, setExpanded] = useState3(false);
  const [activeTool, setActiveTool] = useState3(null);
  const [toast, setToast] = useState3(null);
  useEffect3(() => {
    initCollector();
  }, []);
  useEffect3(() => {
    const handler = () => {
      setExpanded((v) => !v);
      setActiveTool(null);
    };
    const escHandler = () => {
      setExpanded(false);
      setActiveTool(null);
    };
    window.addEventListener("buggy-bag:toggle", handler);
    window.addEventListener("buggy-bag:escape", escHandler);
    return () => {
      window.removeEventListener("buggy-bag:toggle", handler);
      window.removeEventListener("buggy-bag:escape", escHandler);
    };
  }, []);
  const handleToolSelect = (tool) => {
    setExpanded(false);
    setActiveTool(tool);
  };
  const handleSend = async (payload) => {
    setActiveTool(null);
    if (!apiEndpoint || !apiKey) {
      showToast("\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E (\u0431\u0435\u0437 API)", true);
      return;
    }
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, api_key: apiKey })
      });
      showToast(res.ok ? "\u2713 \u0412\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E" : "\u26A0 \u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430", res.ok);
    } catch {
      showToast("\u26A0 \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438", false);
    }
  };
  const showToast = (msg, ok) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4e3);
  };
  const tools = [
    { tool: "rect", icon: /* @__PURE__ */ jsx4(RectIcon, {}), title: "\u0412\u0438\u0434\u0456\u043B\u0438\u0442\u0438 \u043E\u0431\u043B\u0430\u0441\u0442\u044C" },
    { tool: "arrow", icon: /* @__PURE__ */ jsx4(ArrowIcon, {}), title: "\u041D\u0430\u043C\u0430\u043B\u044E\u0432\u0430\u0442\u0438 \u0441\u0442\u0440\u0456\u043B\u043A\u0443" },
    { tool: "pin", icon: /* @__PURE__ */ jsx4(PinIcon, {}), title: "\u041F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u043F\u0456\u043D" }
  ];
  return /* @__PURE__ */ jsxs3(Fragment2, { children: [
    !activeTool && /* @__PURE__ */ jsxs3("div", { "data-buggy-bag": "true", style: { position: "fixed", bottom: "24px", right: "24px", zIndex: 9997, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }, children: [
      expanded && /* @__PURE__ */ jsx4("div", { style: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }, children: tools.map(({ tool, icon, title }) => /* @__PURE__ */ jsx4(
        "button",
        {
          type: "button",
          onClick: () => handleToolSelect(tool),
          title,
          style: { width: "40px", height: "40px", borderRadius: "50%", background: "white", border: "1px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#1f1f1f", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
          children: icon
        },
        tool
      )) }),
      /* @__PURE__ */ jsx4("span", { style: { fontSize: "10px", fontFamily: "monospace", background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.85)", padding: "2px 6px", borderRadius: "4px", userSelect: "none" }, children: "Alt+B" }),
      /* @__PURE__ */ jsx4(
        "button",
        {
          type: "button",
          onClick: () => setExpanded((v) => !v),
          title: "\u0417\u0430\u0444\u0456\u043A\u0441\u0443\u0432\u0430\u0442\u0438 \u0431\u0430\u0433 (Alt+B)",
          style: { width: "48px", height: "48px", borderRadius: "50%", background: expanded ? "#4f46e5" : "#1c1c1e", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", boxShadow: "0 8px 28px rgba(0,0,0,0.4)", transition: "background 0.15s" },
          children: /* @__PURE__ */ jsx4(BugIcon, {})
        }
      )
    ] }),
    activeTool && /* @__PURE__ */ jsx4(CaptureMode, { initialTool: activeTool, apiKey: apiKey ?? "", onSend: handleSend, onCancel: () => setActiveTool(null) }),
    toast && /* @__PURE__ */ jsxs3("div", { "data-buggy-bag": "true", style: { position: "fixed", bottom: "90px", right: "24px", zIndex: 9999, display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "12px", background: toast.ok ? "#1c1c1e" : "#3f1c1c", color: toast.ok ? "white" : "#fca5a5", border: `1px solid ${toast.ok ? "rgba(255,255,255,0.1)" : "#7f1d1d"}`, fontSize: "13px", fontWeight: "600" }, children: [
      toast.msg,
      toast.ok && portalUrl && /* @__PURE__ */ jsx4("a", { href: portalUrl, target: "_blank", rel: "noopener noreferrer", style: { color: "#818cf8", marginLeft: "4px", fontSize: "12px" }, children: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u2192" })
    ] })
  ] });
}
function BuggyBag({ apiEndpoint, apiKey, portalUrl } = {}) {
  useEffect3(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bb") === "on") {
      localStorage.setItem("BUGGY_BAG_ACCESS", "active");
      params.delete("bb");
      window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
    }
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === "b" || e.key === "B" || e.key === "\u0456" || e.key === "\u0406")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("buggy-bag:toggle"));
      }
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("buggy-bag:escape"));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const host = document.createElement("div");
    host.setAttribute("data-buggy-bag", "true");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const peStyle = document.createElement("style");
    peStyle.textContent = "* { pointer-events: auto; }";
    shadow.appendChild(peStyle);
    const styleEl = document.createElement("style");
    styleEl.textContent = styles_gen_default;
    shadow.appendChild(styleEl);
    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);
    const root = createRoot(mountPoint);
    root.render(
      /* @__PURE__ */ jsx4(GodModeGuard, { children: /* @__PURE__ */ jsx4(BuggyBagInner, { apiEndpoint, apiKey, portalUrl }) })
    );
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      host.remove();
      setTimeout(() => root.unmount(), 0);
    };
  }, []);
  return null;
}
function isActive() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("BUGGY_BAG_ACCESS") === "active";
}
function activateFromUrl() {
}
export {
  BuggyBag,
  activateFromUrl,
  collectTechContext,
  initCollector,
  isActive
};
//# sourceMappingURL=index.mjs.map