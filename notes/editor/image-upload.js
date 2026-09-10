(function () {
  "use strict";

  var TOKEN_KEYS = [
    "4k29-editor-github-token-persistent",
    "4k29-editor-github-token"
  ];
  var API_ROOT = "https://api.github.com";
  var OWNER = "4k29";
  var REPOSITORY = "4k29";
  var BRANCH = "main";
  var NOTE_IMAGE_DIRECTORY = "images/notes";
  var OGP_IMAGE_DIRECTORY = "images/ogp";

  var uploadButton = document.getElementById("image-upload-button");
  var uploadInput = document.getElementById("image-upload-input");
  var uploadStatus = document.getElementById("image-upload-status");
  var imagePathInput = document.getElementById("dialog-image-path");
  var imageAltInput = document.getElementById("dialog-image-alt");
  var imageDialog = document.getElementById("image-dialog");
  var body = document.getElementById("body");
  var slugInput = document.getElementById("slug");
  var titleInput = document.getElementById("title");
  var videoUploadButton = document.getElementById("video-upload-button");
  var videoUploadInput = document.getElementById("video-upload-input");
  var ogpPathInput = document.getElementById("image");
  var ogpAltInput = document.getElementById("image-alt");

  if (!uploadButton || !uploadInput || !uploadStatus) return;

  var ogpUploadButton = document.createElement("button");
  ogpUploadButton.type = "button";
  ogpUploadButton.className = "text-button";
  ogpUploadButton.textContent = "OGP画像をアップロード";

  var ogpUploadInput = document.createElement("input");
  ogpUploadInput.type = "file";
  ogpUploadInput.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
  ogpUploadInput.hidden = true;

  var ogpUploadStatus = document.createElement("small");
  ogpUploadStatus.setAttribute("role", "status");
  ogpUploadStatus.setAttribute("aria-live", "polite");

  if (ogpPathInput && ogpPathInput.parentElement) {
    ogpPathInput.parentElement.appendChild(ogpUploadButton);
    ogpPathInput.parentElement.appendChild(ogpUploadInput);
    ogpPathInput.parentElement.appendChild(ogpUploadStatus);
  }

  function readToken() {
    try {
      return window.localStorage.getItem(TOKEN_KEYS[0]) || window.sessionStorage.getItem(TOKEN_KEYS[1]) || "";
    } catch (error) {
      return "";
    }
  }

  function normalizeBaseName(value) {
    var base = String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[\\/:*?"<>|#%]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base || "note";
  }

  function fileExtension(file) {
    if (file.type === "video/mp4" || /\.mp4$/i.test(file.name)) return ".mp4";
    var dot = file.name.lastIndexOf(".");
    if (dot >= 0) return file.name.slice(dot).toLowerCase();

    var extensions = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/avif": ".avif"
    };
    return extensions[file.type] || ".webp";
  }

  function articleBaseName() {
    var slug = slugInput ? slugInput.value : "";
    var title = titleInput ? titleInput.value : "";
    return normalizeBaseName(slug || title);
  }

  function repositoryContentUrl(path) {
    return API_ROOT + "/repos/" + OWNER + "/" + REPOSITORY + "/contents/" +
      path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(BRANCH);
  }

  async function fetchExistingFile(path, token) {
    var response = await window.fetch(repositoryContentUrl(path), {
      method: "GET",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store",
      credentials: "omit"
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      var error = new Error("画像の保存先を確認できませんでした");
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function nextNoteFileName(file, token) {
    var base = articleBaseName();
    var extension = fileExtension(file);

    for (var number = 1; number <= 999; number += 1) {
      var filename = base + "-" + number + extension;
      var path = NOTE_IMAGE_DIRECTORY + "/" + filename;
      if (!(await fetchExistingFile(path, token))) return filename;
    }

    throw new Error("画像番号の上限に達しました");
  }

  function blobToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () {
        reject(reader.error || new Error("画像を読み込めませんでした"));
      };
      reader.onload = function () {
        resolve(String(reader.result).split(",")[1] || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function validateFile(file) {
    if (!/^image\/(jpeg|png|webp|gif|avif)$/i.test(file.type)) {
      throw new Error("JPEG、PNG、WebP、GIF、AVIFの画像を選んでください。");
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("画像は20MB以下にしてください。");
    }
  }

  async function putFile(path, file, token, existingSha, message) {
    var content = await blobToBase64(file);
    var payload = {
      message: message,
      content: content,
      branch: BRANCH
    };
    if (existingSha) payload.sha = existingSha;

    var response = await window.fetch(
      API_ROOT + "/repos/" + OWNER + "/" + REPOSITORY + "/contents/" + path.split("/").map(encodeURIComponent).join("/"),
      {
        method: "PUT",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        credentials: "omit"
      }
    );

    if (!response.ok) {
      var details = null;
      try {
        details = await response.json();
      } catch (error) {
        details = null;
      }
      var uploadError = new Error(details && details.message ? details.message : "GitHubへアップロードできませんでした");
      uploadError.status = response.status;
      throw uploadError;
    }
  }

  async function uploadNoteImage(file) {
    var token = readToken();
    if (!token) throw new Error("GitHubキーが見つかりません");

    var filename = await nextNoteFileName(file, token);
    var path = NOTE_IMAGE_DIRECTORY + "/" + filename;
    await putFile(path, file, token, null, "Upload note image: " + filename);

    return {
      markdownPath: "../" + path,
      filename: filename
    };
  }

  async function uploadOgpImage(file) {
    var token = readToken();
    if (!token) throw new Error("GitHubキーが見つかりません");

    var filename = articleBaseName() + fileExtension(file);
    var path = OGP_IMAGE_DIRECTORY + "/" + filename;
    var existing = await fetchExistingFile(path, token);
    await putFile(path, file, token, existing && existing.sha, "Upload OGP image: " + filename);

    return {
      path: "/" + path,
      filename: filename
    };
  }

  function insertImageMarkdown(path, alt) {
    var start = body.selectionStart;
    var end = body.selectionEnd;
    var markdown = "![" + alt.replace(/\]/g, "") + "](" + path.replace(/\s/g, "%20") + ")";
    var before = body.value.slice(0, start);
    var after = body.value.slice(end);
    var prefix = before && !/\n\n$/.test(before) ? "\n\n" : "";
    var suffix = after && !/^\n\n/.test(after) ? "\n\n" : "";
    body.value = before + prefix + markdown + suffix + after;
    var caret = (before + prefix + markdown).length;
    body.setSelectionRange(caret, caret);
    body.dispatchEvent(new Event("input", { bubbles: true }));
    body.focus();
  }

  function showUploadError(error, statusElement) {
    if (error.status === 403 || error.status === 404) {
      statusElement.textContent = "書き込み権限がありません";
      window.alert("GitHubキーの対象リポジトリに「4k29」を追加し、ContentsをRead and writeにしてください。");
    } else {
      statusElement.textContent = "アップロードできませんでした";
      window.alert(error.message || "画像をアップロードできませんでした。通信状況を確認してください。");
    }
  }

  videoUploadButton.addEventListener("click", function () {
    videoUploadInput.click();
  });

  videoUploadInput.addEventListener("change", async function () {
    var file = videoUploadInput.files && videoUploadInput.files[0];
    if (!file) return;
    if (!(file.type === "video/mp4" || (!file.type && /\.mp4$/i.test(file.name))) || !file.size || file.size > 20 * 1024 * 1024) {
      window.alert("20MB以下のMP4動画を選んでください。");
      videoUploadInput.value = "";
      return;
    }
    videoUploadButton.disabled = true;
    uploadButton.disabled = true;
    uploadStatus.textContent = "動画をアップロード中…";
    try {
      var uploaded = await uploadNoteImage(file);
      var previousPreview = window.noteVideoPreviews.get(uploaded.markdownPath);
      if (previousPreview) URL.revokeObjectURL(previousPreview);
      window.noteVideoPreviews.set(uploaded.markdownPath, URL.createObjectURL(file));
      var videoDialog = document.getElementById("video-dialog");
      if (videoDialog.open) videoDialog.close();
      var path = uploaded.markdownPath.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      var markup = '\n\n<video controls playsinline preload="metadata" src="' + path + '"></video>\n\n';
      body.setRangeText(markup, body.selectionStart, body.selectionEnd, "end");
      body.dispatchEvent(new Event("input", { bubbles: true }));
      body.focus();
      uploadStatus.textContent = "動画を挿入しました：" + uploaded.filename;
    } catch (error) {
      showUploadError(error, uploadStatus);
    } finally {
      videoUploadButton.disabled = false;
      uploadButton.disabled = false;
      videoUploadInput.value = "";
    }
  });

  uploadButton.addEventListener("click", function () {
    uploadInput.click();
  });

  uploadInput.addEventListener("change", async function () {
    var file = uploadInput.files && uploadInput.files[0];
    if (!file) return;

    try {
      validateFile(file);
    } catch (error) {
      window.alert(error.message);
      uploadInput.value = "";
      return;
    }

    uploadButton.disabled = true;
    uploadStatus.textContent = "GitHubへアップロード中…";

    try {
      var uploaded = await uploadNoteImage(file);
      var suggestedAlt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      imagePathInput.value = uploaded.markdownPath;
      imageAltInput.value = suggestedAlt;
      uploadStatus.textContent = "アップロード済み：" + uploaded.filename;
      insertImageMarkdown(uploaded.markdownPath, suggestedAlt);
      if (imageDialog && imageDialog.open) imageDialog.close();
    } catch (error) {
      showUploadError(error, uploadStatus);
    } finally {
      uploadButton.disabled = false;
      uploadInput.value = "";
    }
  });

  ogpUploadButton.addEventListener("click", function (event) {
    event.preventDefault();
    ogpUploadInput.click();
  });

  ogpUploadInput.addEventListener("change", async function () {
    var file = ogpUploadInput.files && ogpUploadInput.files[0];
    if (!file) return;

    try {
      validateFile(file);
    } catch (error) {
      window.alert(error.message);
      ogpUploadInput.value = "";
      return;
    }

    ogpUploadButton.disabled = true;
    ogpUploadStatus.textContent = " GitHubへアップロード中…";

    try {
      var uploaded = await uploadOgpImage(file);
      ogpPathInput.value = uploaded.path;
      if (ogpAltInput && !ogpAltInput.value.trim()) {
        ogpAltInput.value = titleInput && titleInput.value.trim() ? titleInput.value.trim() : file.name.replace(/\.[^.]+$/, "");
      }
      ogpPathInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (ogpAltInput) ogpAltInput.dispatchEvent(new Event("input", { bubbles: true }));
      ogpUploadStatus.textContent = " アップロード済み：" + uploaded.filename;
    } catch (error) {
      showUploadError(error, ogpUploadStatus);
    } finally {
      ogpUploadButton.disabled = false;
      ogpUploadInput.value = "";
    }
  });
})();
