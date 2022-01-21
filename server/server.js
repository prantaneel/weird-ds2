if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const axios = require("axios");
const bp = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const passport = require("passport");
const blogidcalc = require("./functions/blog-id-calc");
const constants = require("./functions/constants");
var CookieParser = require("cookie-parser");
const flash = require("express-flash");
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
app.use(express.static(__dirname + "/public"));
app.use(bp.json());
app.use(bp.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "*",
  })
);
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
  var addData = deleteFromArray(pendingArray, blogid, OUT_OF_BOUNDS);
  if (addData === OUT_OF_BOUNDS)
    addData = deleteFromArray(declinedArray, blogid, OUT_OF_BOUNDS);
  if (appCode === 1) {
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
const blog_data = {
  blogs: [],
};
const pending_requests = {
  pending_blogs: [],
};
const denied_blogs = {
  declined_blogs: [],
};
const users = [
  {
    id: "1642801539637",
    name: "w",
    email: "w@w",
    password: "$2b$10$rfVPNSadHHHtBj9sB298Ju/1GthV1QeNuzhhabMtRpwZ6hc18mh3W",
  },
];
var blogIdState = INIT_BLOG_ID;
//-------------------------------------------------
//------------------Landing Page----------------
app.get("/", (req, res) => {
  res.render("landing-page");
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
  res.render("blog-template", { bid: bid });
});
//-----------------Add new blog------------------------------------------------
//-------------------------------------------------
app.post("/new-blog-post", async (req, res) => {
  const blogd = req.body;
  const serverTime = await getTime(timeURL);
  blogIdState = blogidcalc.getblogid(blogIdState, BLOG_ID_INC);
  var newDataObject = blogidcalc.formDataModel(blogd, blogIdState, serverTime);
  pending_requests.pending_blogs.push(newDataObject);
});

app.get("/admin-approve", checkAuthenticated, (req, res) => {
  console.log(users);
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
  res.render("blogs");
});
////////////////////////////////
////////////////////////////////////////////////////////////////
/////---------------admin login--------------------------------
app.get("/admin-login", checkNotAuthenticated, (req, res) => {
  res.render("admin-login.ejs");
});
app.get("/admin-register", checkNotAuthenticated, (req, res) => {
  res.render("admin-register.ejs");
});
app.post("/admin-register", checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });
    res.redirect("/admin-login");
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
//-------------end of endpoints----------------

app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/error.html");
});

app.listen(PORT, function () {
  console.log("Server started!");
});
