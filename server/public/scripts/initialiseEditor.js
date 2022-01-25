var editorWindowRef;
let liveData = {
  blog_title: "",
  blog_html: "",
};
tinymce.init({
  selector: "#mytextarea",
  width: "70%",
  height: 500,
  onchange_callback: "tinymceOnchange",
  setup: function (editor) {
    editor.on("keyup", function (e) {
      liveData.blog_title = document.getElementById("input_field").value;
      liveData.blog_html = tinymce.get("mytextarea").getContent();
      if (editorWindowRef) {
        var time = new Date();
        var date = time.toLocaleDateString();
        time = time.toLocaleTimeString();
        editorWindowRef.document.getElementById("blog-title").textContent =
          liveData.blog_title;
        editorWindowRef.document.getElementById(
          "blog-time"
        ).textContent = `Updated on ${date}, ${time}`;
        editorWindowRef.document.getElementById("blog-body").innerHTML =
          liveData.blog_html;
      }
    });
  },
  codesample_languages: [
    { text: "HTML/XML", value: "markup" },
    { text: "JavaScript", value: "javascript" },
    { text: "CSS", value: "css" },
    { text: "PHP", value: "php" },
    { text: "Ruby", value: "ruby" },
    { text: "Python", value: "python" },
    { text: "Java", value: "java" },
    { text: "C", value: "c" },
    { text: "C#", value: "csharp" },
    { text: "C++", value: "cpp" },
  ],
  plugins: [
    "advlist autolink link image lists charmap print preview hr anchor pagebreak",
    "searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking",
    "table emoticons template paste help",
    "image tiny_mce_wiris",
    "codesample",
  ],
  toolbar:
    "undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | " +
    "bullist numlist outdent indent | link image | print media fullscreen | " +
    "forecolor backcolor emoticons | help |" +
    "tiny_mce_wiris_formulaEditor | codesample",
  menu: {
    favs: {
      title: "My Favorites",
      items: "code visualaid | searchreplace | emoticons",
    },
  },
  external_plugins: {
    tiny_mce_wiris: "https://www.wiris.net/demo/plugins/tiny_mce/plugin.js",
  },
  menubar: "favs file edit view insert format tools table help",
  content_css: "/styles/content.css",
  codesample_content_css: "prism/prism.css",
  codesample_global_prismjs: true,
  theme_advanced_toolbar_location: "top",
  body_class: "body_class",
});