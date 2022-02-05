if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const fs = require("fs");
const express = require("express");
const axios = require("axios");
const bp = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const passport = require("passport");
const blogidcalc = require("./functions/blog-id-calc");
const constants = require("./functions/constants");
const methodOverride = require("method-override");
var cookieParser = require("cookie-parser");
var flash = require("express-flash");
const session = require("express-session");

const initializePassport = require("./passport-config");

initializePassport(
  passport,
  (email) => users.find((user) => user.email === email),
  (id) => users.find((user) => user.id === id)
);

const OUT_OF_BOUNDS = constants.OUT_OF_BOUNDS;
const INIT_BLOG_ID = constants.INIT_BLOG_ID;
const BLOG_ID_INC = constants.BLOG_ID_INC;
const PORT = constants.PORT;
const timeURL = constants.TIME_URL;

//----------------------------Configuration----------------------------------------------------
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);
app.use(express.static(__dirname + "/public"));
app.use(bp.json());
app.use(bp.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));
//----------------------------------------------------------------
//============================================================================
///------------------Random functions----------------------------------------------------------------
function deleteFromArray(arr, blogid, OUT_OF_BOUNDS) {
  var returnData = OUT_OF_BOUNDS;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].blog_id === blogid) {
      returnData = arr[i];
      arr.splice(i, 1);
      break;
    }
  }
  return returnData;
}
function findInArr(arr, blogid, OUT_OF_BOUNDS) {
  var returnVar = OUT_OF_BOUNDS;
  arr.forEach((element) => {
    if (element.blog_id === blogid) {
      returnVar = element;
    }
  });
  return returnVar;
}
function adminApprove(
  approveBody,
  pendingArray,
  declinedArray,
  blogArray,
  OUT_OF_BOUNDS
) {
  var appCode = parseInt(approveBody.approve_code);
  var blogid = parseInt(approveBody.blog_id);
  var rev = parseInt(approveBody.rev);
  var addData = deleteFromArray(pendingArray, blogid, OUT_OF_BOUNDS);
  if (addData === OUT_OF_BOUNDS)
    addData = deleteFromArray(declinedArray, blogid, OUT_OF_BOUNDS);
  if (appCode === 1) {
    if (rev > 0) {
      for (articles in blog_data.blogs) {
        if (blog_data.blogs[articles].blog_id === blogid) {
          //console.log(blog_data.blogs[articles]);
          blog_data.blogs[articles].blog_title = addData.blog_title;
          blog_data.blogs[articles].blog_html = addData.blog_html;
          return;
        }
      }
    }
    if (addData !== OUT_OF_BOUNDS) blogArray.push(addData);
  } else {
    if (addData !== OUT_OF_BOUNDS) declinedArray.push(addData);
  }
}
async function getTime(url = "") {
  var responseData = await axios.get(url).then((response) => {
    //console.log(response);
    return response;
  });
  return responseData.data;
}

//------------------app settings----------------
//-------------------storage------------------------------
//----------------------------------------------------------------
var fileData;
var blog_data = {};
var pending_requests = {};
var denied_blogs = {};
var blogTags = [];
var users = [];
var blogIdState = INIT_BLOG_ID;
//-----------------------Data initialisation-------------------------
function getData() {
  fileData = fs.readFileSync("../storage_temp/dataFile.json");
  fileData = JSON.parse(fileData);
  blog_data = fileData.blog_data;
  pending_requests = fileData.pending_requests;
  denied_blogs = fileData.denied_blogs;
  blogTags = fileData.blogTags;
  users = fileData.users;
  blogIdState = fileData.blogIdState;
  // console.log(
  //   fileData,
  //   blog_data,
  //   pending_requests,
  //   denied_blogs,
  //   blogTags,
  //   users
  // );
}
function writeData() {
  //console.log(fileData);
  fileData.blog_data = blog_data;
  fileData.pending_requests = pending_requests;
  fileData.denied_blogs = denied_blogs;
  fileData.blogTags = blogTags;
  fileData.users = users;
  fileData.blogIdState = blogIdState;
  fs.writeFileSync("../storage_temp/dataFile.json", JSON.stringify(fileData));
}
getData();
//------------------Landing Page----------------
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/landing-page.html");
});

app.get("/blog-editor", (req, res) => {
  res.render("editor");
});
//----------------------New Blog Entry------------------------------
//blog-entry can be later used as an external API endpoint
app.get("/blog-entry", (req, res) => {
  let bid = parseInt(req.query.bid);
  var returnObject = findInArr(blog_data.blogs, bid, OUT_OF_BOUNDS);
  if (returnObject !== OUT_OF_BOUNDS) res.json(returnObject);
  else {
    res.json({ found: false });
  }
});
//-------------------------------------------------
//-------------------------------------------------
app.get("/blog-data", (req, res) => {
  let bid = parseInt(req.query.bid);
  //console.log(bid);

  for (articles in blog_data.blogs) {
    if (blog_data.blogs[articles].blog_id === bid) {
      //console.log(blog_data.blogs[articles]);
      res.render("blog-template", { blogObject: blog_data.blogs[articles] });
      return;
    }
  }
  res.render("error");
});
////////////////////////////////////////////////////////////////////////
app.get("/blog-edit", (req, res) => {
  var bid = parseInt(req.query.bid);
  for (articles in blog_data.blogs) {
    if (blog_data.blogs[articles].blog_id === bid) {
      //console.log(blog_data.blogs[articles]);
      res.render("blog-edit", { blogObject: blog_data.blogs[articles] });
      return;
    }
  }
});
app.post("/blog-edit", async (req, res) => {
  var body = req.body;
  // console.log(body);
  var bid = parseInt(body.blog_id);
  const serverTime = await getTime(timeURL);
  var ind = 0;
  for (articles in blog_data.blogs) {
    if (blog_data.blogs[articles].blog_id === bid) {
      // console.log(blog_data.blogs[articles]);
      ind = articles;
      break;
    }
  }
  blog_data.blogs[ind].rev++;
  var newData = blog_data.blogs[ind];
  newData.blog_server_time = serverTime;
  newData.blog_title = body.blog_title;
  newData.blog_html = body.blog_html;
  pending_requests.pending_blogs.push(newData);
  writeData();
  res.sendStatus(200);
});
////////////////////////////////////////////////////////////////////////
//-----------------Add new blog------------------------------------------------
//-------------------------------------------------
app.post("/new-blog-post", cors(), async (req, res) => {
  const blogd = req.body;
  const serverTime = await getTime(timeURL);
  blogIdState = blogidcalc.getblogid(blogIdState, BLOG_ID_INC);
  var newDataObject = blogidcalc.formDataModel(blogd, blogIdState, serverTime);
  pending_requests.pending_blogs.push(newDataObject);
  writeData();
  res.sendStatus(200);
});

app.get("/admin-approve", checkAuthenticated, (req, res) => {
  //console.log(users);
  //console.log(pending_requests);
  res.render("admin-approve", {
    pending_requests: pending_requests,
  });
});
app.get("/admin-declined", checkAuthenticated, (req, res) => {
  res.render("declined-requests", {
    declined_requests: denied_blogs,
  });
});
//---------------admin-previewer---------------
app.get("/admin-review", checkAuthenticated, (req, res) => {
  var blogid = parseInt(req.query.bid);
  var sendData = findInArr(
    pending_requests.pending_blogs,
    blogid,
    OUT_OF_BOUNDS
  );
  if (sendData === OUT_OF_BOUNDS)
    sendData = findInArr(denied_blogs.declined_blogs, blogid, OUT_OF_BOUNDS);
  if (sendData === OUT_OF_BOUNDS)
    sendData = findInArr(blog_data.blogs, blogid, OUT_OF_BOUNDS);
  res.render("admin-review", { blogObject: sendData });
});
//-------------admin-approve-code-incoming-------------
//--------------------------------------------------------
//----------------------------------------------------------------
//----------------------------------------------------------------

app.post("/admin-approve", checkAuthenticated, (req, res) => {
  const approveBody = req.body;
  adminApprove(
    approveBody,
    pending_requests.pending_blogs,
    denied_blogs.declined_blogs,
    blog_data.blogs,
    OUT_OF_BOUNDS
  );
  writeData();
  res.sendStatus(200);
});
//-------------live editor--------------------------------
app.get("/live-editor", (req, res) => {
  res.render("blog-template-live-server");
});
////////////////////////////////
////////////////////////////////////////////////////////////////
///-----------recommendation--------------------------------
app.get("/blogs", (req, res) => {
  res.render("blogs", { blog_data: blog_data });
});
////////////////////////////////
////////////////////////////////////////////////////////////////
/////---------------admin login--------------------------------
app.get("/admin-login", checkNotAuthenticated, (req, res) => {
  res.render("admin-login.ejs");
});
app.get("/admin-register", checkNotAuthenticated, (req, res) => {
  var regerr = req.query.registerError;
  if (regerr === "alreadyregistered") {
    res.render("admin-register.ejs", { errorMessage: "Already Registered" });
  } else if (regerr === "missingcreds") {
    res.render("admin-register.ejs", { errorMessage: "Missing Credentials" });
  } else res.render("admin-register.ejs", { errorMessage: undefined });
});
app.post("/admin-register", checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    //need to check if the user with that mail already exists
    var user = users.find((user) => user.email === req.body.email);
    if (user) {
      var registeredError = "alreadyregistered";
      res.redirect(`/admin-register?registerError=${registeredError}`);
    } else if (
      req.body.email == "" ||
      req.body.name == "" ||
      req.body.password == ""
    ) {
      var registeredError = "missingcreds";
      res.redirect(`/admin-register?registerError=${registeredError}`);
    } else {
      users.push({
        id: Date.now().toString(),
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
      });
      writeData();
      res.redirect("/admin-login");
    }
  } catch {
    res.redirect("/admin-register");
  }
});

app.post(
  "/admin-login",
  checkNotAuthenticated,
  passport.authenticate("local", {
    successRedirect: "/admin-approve",
    failureRedirect: "/admin-login",
    failureFlash: true,
  })
);
app.delete("/admin-logout", (req, res) => {
  req.logOut();
  res.redirect("/admin-login");
});
////////////////////////////////
/////////////////////////////function////////////////////////////
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/admin-login");
}
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/admin-approve");
  }
  return next();
}
////////////////////////////////
////////////////////////////////////////////////////////////////
app.get("/example-api", (req, res) => {
  var data = [
    { lol: 1, name: "rolex", freq: 27 },
    { id: 2, name: "Python" },
    { id: 13, name: "JavaScript" },
    { id: 17, name: "ActionScript" },
    { id: 19, name: "Scheme" },
    { id: 23, name: "Lisp" },
    { id: 29, name: "C#" },
    { id: 31, name: "Fortran" },
    { id: 37, name: "Visual Basic" },
    { id: 41, name: "C" },
    { id: 43, name: "C++" },
    { id: 47, name: "Java" },
    { id: 49, name: "fuck" },
  ];
  res.send(data);
});
////////////////////////////////////////////////////////////////
//-------------end of endpoints----------------

app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/error.html");
});

app.listen(3000, function () {
  console.log("Server started!");
});
