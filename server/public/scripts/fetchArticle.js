const URL = `http://localhost:3000/blog-entry?bid=${bid}`;
console.log(URL);
function loadPage(href) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", href, false);
  xmlhttp.send();
  return xmlhttp.responseText;
}
async function postData(url) {
  // Default options are marked with *
  let res = await fetch(url, {
    method: "GET", // *GET, POST, PUT, DELETE, etc.
    mode: "same-origin", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      //"Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer",
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      let re = data;
      console.log(re);
      //put html
      if (re.found === false) {
        document.getElementById("hr-alt").style.display = "none";
        document.getElementById("blog-body").style.display = "none";
        var errorHtml = loadPage("../error.html");
        document.write(errorHtml);
      } else {
        document.title = re.blog_title;
        document.getElementById("blog-title").textContent = re.blog_title;
        document.getElementById(
          "blog-time"
        ).textContent = `Published on ${re.blog_server_time.date}, ${re.blog_server_time.time}`;
        document.getElementById("blog-body").innerHTML = re.blog_html;
        var x = document.getElementsByTagName("PRE");
        for (var i = 0; i < x.length; i++) {
          x[i].classList.add("line-numbers");
        }
      }
      Prism.highlightAll();
    });
  return res; // parses JSON response into native JavaScript objects
}
let res = postData(URL);
