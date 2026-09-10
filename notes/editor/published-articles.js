(function () {
  "use strict";

  var button = document.getElementById("published-button");
  var dialog = document.getElementById("published-dialog");
  var closeButton = document.getElementById("published-close");
  var refreshButton = document.getElementById("published-refresh");
  var newButton = document.getElementById("published-new");
  var status = document.getElementById("published-status");
  var list = document.getElementById("published-list");
  var publishButton = document.getElementById("publish-button");
  var saveStatus = document.getElementById("save-status");

  if (!button || !dialog || !list) return;

  var fields = {
    title: document.getElementById("title"),
    slug: document.getElementById("slug"),
    date: document.getElementById("date"),
    description: document.getElementById("description"),
    image: document.getElementById("image"),
    imageAlt: document.getElementById("image-alt"),
    tags: document.getElementById("tags"),
    body: document.getElementById("body")
  };

  function parseValue(value) {
    var text = String(value || "").trim();
    if (!text) return "";
    try {
      return JSON.parse(text);
    } catch (error) {
      return text.replace(/^['"]|['"]$/g, "");
    }
  }

  function parseMarkdown(text, path) {
    var source = String(text || "").replace(/\r\n?/g, "\n");
    var data = {};
    var body = source;

    if (source.indexOf("---\n") === 0) {
      var end = source.indexOf("\n---\n", 4);
      if (end !== -1) {
        var frontMatter = source.slice(4, end).split("\n");
        body = source.slice(end + 5).replace(/^\n+|\n+$/g, "");
        frontMatter.forEach(function (line) {
          var match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
          if (match) data[match[1]] = parseValue(match[2]);
        });
      }
    }

    var permalink = typeof data.permalink === "string" ? data.permalink : "";
    var slugMatch = permalink.match(/\/notes\/([^/]+)\.html$/);
    var filename = String(path || "").split("/").pop() || "";
    var filenameSlug = filename.replace(/\.md$/i, "");
    var publishedDate = typeof data.date === "string" ? data.date.match(/^\d{4}-\d{2}-\d{2}/) : null;

    return {
      title: typeof data.title === "string" ? data.title : filenameSlug,
      slug: slugMatch ? slugMatch[1] : filenameSlug,
      date: publishedDate ? publishedDate[0] : "",
      description: typeof data.description === "string" ? data.description : "",
      image: typeof data.image === "string" ? data.image : "",
      imageAlt: typeof data.image_alt === "string" ? data.image_alt : "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      body: body
    };
  }

  function setEditorData(data) {
    fields.slug.readOnly = false;
    fields.slug.value = data.slug || "";
    fields.slug.dispatchEvent(new Event("input", { bubbles: true }));

    fields.title.value = data.title || "";
    fields.date.value = data.date || "";
    fields.description.value = data.description || "";
    fields.image.value = data.image || "";
    fields.imageAlt.value = data.imageAlt || "";
    fields.tags.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
    fields.body.value = data.body || "";

    [fields.title, fields.date, fields.description, fields.image, fields.imageAlt, fields.tags, fields.body]
      .forEach(function (field) {
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      });

    fields.slug.readOnly = true;
  }

  function enterEditMode(record, path) {
    setEditorData(record);
    window.NotePublishedEdit = {
      path: path,
      slug: record.slug,
      title: record.title
    };
    publishButton.textContent = "更新";
    publishButton.dataset.mode = "update";
    saveStatus.textContent = "公開済み記事を編集中: " + record.title;
  }

  function leaveEditMode(clearFields) {
    window.NotePublishedEdit = null;
    fields.slug.readOnly = false;
    publishButton.textContent = "公開";
    delete publishButton.dataset.mode;

    if (clearFields) {
      Object.keys(fields).forEach(function (key) {
        fields[key].value = "";
        fields[key].dispatchEvent(new Event("input", { bubbles: true }));
      });
      saveStatus.textContent = "新しい記事を作成できます";
    }
  }

  async function readRecord(file) {
    var result = await window.EditorPublicGitHub.readText(file.path);
    return {
      path: file.path,
      record: parseMarkdown(result.content, file.path)
    };
  }

  function renderRecord(item) {
    var articleButton = document.createElement("button");
    articleButton.type = "button";
    articleButton.className = "published-item";

    var title = document.createElement("strong");
    title.textContent = item.record.title;

    var meta = document.createElement("span");
    meta.textContent = (item.record.date || "日付なし") + " · " + item.path.replace(/^_notes\//, "");

    articleButton.appendChild(title);
    articleButton.appendChild(meta);
    articleButton.addEventListener("click", function () {
      enterEditMode(item.record, item.path);
      dialog.close();
      fields.title.focus();
    });
    list.appendChild(articleButton);
  }

  async function refresh() {
    var api = window.EditorPublicGitHub;
    list.innerHTML = "";

    if (!api || !api.isReady || !api.isReady()) {
      status.textContent = "GitHubキーが必要です。EditorのGitHub接続を完了してください。";
      return;
    }

    status.textContent = "公開済み記事を読み込み中…";
    refreshButton.disabled = true;

    try {
      var files = await api.listDirectory("_notes");
      files = files.filter(function (file) {
        return file.type === "file" && /\.md$/i.test(file.name);
      });

      var records = await Promise.all(files.map(readRecord));
      records.sort(function (a, b) {
        return String(b.record.date || "").localeCompare(String(a.record.date || "")) ||
          a.record.title.localeCompare(b.record.title, "ja");
      });

      records.forEach(renderRecord);
      status.textContent = records.length + "件の公開済み記事";
    } catch (error) {
      status.textContent = "公開済み記事を取得できませんでした。GitHub接続と権限を確認してください。";
    } finally {
      refreshButton.disabled = false;
    }
  }

  button.addEventListener("click", function () {
    dialog.showModal();
    refresh();
  });

  closeButton.addEventListener("click", function () {
    dialog.close();
  });

  refreshButton.addEventListener("click", refresh);

  newButton.addEventListener("click", function () {
    if (!window.confirm("編集中の内容を閉じて、新しい記事の入力欄に切り替えますか？")) return;
    leaveEditMode(true);
    dialog.close();
    fields.title.focus();
  });
}());
