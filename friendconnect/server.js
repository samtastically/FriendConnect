/*
Author: Samantha Cox
File: server.js
Description: This contains the server code for the FriendConnect application. The
server takes and handles several get, post, put, and delete paths made by the
user to the server. Has the following schema: Posts (represents posts made by the
user), Users (for users in the database), Comments (represents comments made on posts),
and Groups (represents groups users are a part of). Utilizes mongoose and express to
store data and handle different paths made by the user. Uses multer for image
uploading to the server, and crypto to salt and hash passwords. Keeps users logged in
via cookies and keeps tracks of the cookies using cookie-parser module.
*/

// import modules so we can use express mongodb, json, and express
const mongoose = require('mongoose');
const express = require('express');
const parser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const port    = 3000;
const iterations = 1000;

const app     = express();
app.use(cookieParser());
// this code allows us to handle POST requests made to the server
app.use(parser.json());
app.use(parser.urlencoded( { extended: true }));

// establish what our mongodb database is
const db = mongoose.connection;
const mongoDBURL = "mongodb://127.0.0.1/friendconnect";

//ObjectID is not naturally global variable, have to declare it here
var ObjectId = require('mongodb').ObjectID;

var sessionKeys = {};

/*
Every 500 milliseconds, ping server to updateSessions(). If user has not been been
active on server for certain amount of time they are no longer autheticated on the
pages and removes their session from the list of sessionKeys.
*/
function updateSessions() {
  let now = Date.now();
  for (user in sessionKeys) {
    if (sessionKeys[user][1] < (now - 3600000)) {
      delete sessionKeys[user];
    }
  }
}

setInterval(updateSessions, 500);

/*
Establishes how multer storage of files should look -> this approach made uploading
and retrieving file paths much easier.
*/
const storage = multer.diskStorage({
  // where image should end up
  destination: (req, file, cb) => {
    cb(null, __dirname + '/uploads/images');
  },
  // what file should be named
  filename: (req, file, cb) => {
    cb(null, file.originalname + '-' + Date.now());
  }
});

var upload = multer({ storage: storage });

var Schema = mongoose.Schema;

// create UserSchema to represent the user objects being saved in and retrieved
// from the server -- keeps track of name, email, salt, hash, bio, posts, comments,
// groups, friend requests, and profile picc
var UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  salt: String,
  hash: String,
  visibility: String,
  bio: String,
  posts: [{type: Schema.Types.ObjectId, ref: 'Post'}],
  comments: [{type: Schema.Types.ObjectId, ref: 'Comment'}],
  groups: [{type: Schema.Types.ObjectId, ref: 'Group'}],
  friends: [{type: Schema.Types.ObjectId, ref: 'User'}],
  sentRequests: [{type: Schema.Types.ObjectId, ref: 'User'}],
  receivedRequests: [{type: Schema.Types.ObjectId, ref: 'User'}],
  img: String
});
var User = mongoose.model('User', UserSchema );

// create PostSchema to represent the post objects being saved in and retrieved
// from the server -- keeps track of timestamp, user who posted it, content,
// comments, likes
var PostSchema = new Schema({
  time: Number,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  content: String,
  comments: [{type: Schema.Types.ObjectId, ref: 'Comment'}],
  likes: [{type: Schema.Types.ObjectId, ref: 'User'}]
});
var Post = mongoose.model('Post', PostSchema );

// create CommentSchema to represent the comment objects being saved in and retrieved
// from the server -- keeps track of timestamp, user who posted it, content,
// and post attached to
var CommentSchema = new Schema({
  time: Number,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  content: String,
  post: { type: Schema.Types.ObjectId, ref: 'Post' }
});
var Comment = mongoose.model('Comment', CommentSchema );

// create GroupSchema to represent the group objects being saved in and retrieved
// from the server -- keeps track of group name, creator, bio, members of group
var GroupSchema = new Schema({
  name: String,
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  bio: String,
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});
var Group = mongoose.model('Group', GroupSchema );

// establish default connection with mongodb
mongoose.connect(mongoDBURL, { useNewUrlParser: true });
db.on('error', console.error.bind(console, 'MongoDB connection error'));

/*
Authentication middleware function that determines if a user should have access to
certain pages that require you to be signed in to have access to. Checks sessionKeys
to see if the user is currently logged in via a session.

@req represents request to server
@res represents response to client
@next represents the next thing to do
*/
function authenticate(req, res, next) {
  // need to see if there are any cookies and sessionkeys
  if ((Object.keys(req.cookies).length > 0) && (Object.keys(sessionKeys).length > 0)) {
    let user = req.cookies.login.email;
    let key = req.cookies.login.key;
    if ( Object.keys(sessionKeys[user]).length > 0 && sessionKeys[user][0] == key) {
      next();
    } else {
      res.redirect('/index.html');
    }
  } else {
    res.redirect('/index.html');
  }
}

/*
Middleware function to determine if user is logged in. I know this was not discussed, but
logically, if a user is signed in via a session, they should not sign in via index.html
again. Instead, they can be immediately redirected to home.html.

@req represents request to server
@res represents response to client
@next represents the next thing to do
*/
function loggedIn(req, res, next) {
  // need to see if there are any cookies and sessionkeys
  if ((Object.keys(req.cookies).length > 0) && (Object.keys(sessionKeys).length > 0)) {
    let user = req.cookies.login.email;
    let key = req.cookies.login.key;
    if (Object.keys(sessionKeys[user]).length > 0 && sessionKeys[user][0] == key) {
      res.redirect('/home.html');
    } else {
      next();
    }
  } else {
      next();
  }
}

// handle static requests with public_html directory & use middleware to handle
// authentication of certain pages
app.use('/index.html', loggedIn);
app.use('/home.html', authenticate);
app.use('/', express.static('public_html'));
app.use('/uploads/images', express.static(process.cwd() + '/uploads/images'));

/*
At the specified URL, returns to the client the list of all the users currently
saved in the friendconnect database. If no users are found, should display an empty
list.
*/
app.get('/get/users/', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.find({})
    // populate these fields so this information is readibly visible
    .populate('sentRequests')
    .populate('receivedRequests')
    .populate('friends')
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results, null, ' '));
    })
});

/*
At the specified URL, returns the user that was specified by the email address
provided as a parameter.
*/
app.get('/get/user/:email', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.find({email: req.params.email})
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results, null, ' '));
    })
});

/*
At the specified URL, returns the profile pic of the user specified (returns string
which might be a get query to the database for an image).
*/
app.get('/get/img/:email', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.find({email: req.params.email})
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results[0].img, null, ' '));
    })
});

/*
At the specified URL, returns to the client the list of all the groups currently
saved in the friendconnect database. If no items are found, should display an
empty list.
*/
app.get('/get/groups/', (req, res) => {
  var groups = mongoose.model('Group', GroupSchema);
  groups.find({})
    .populate('creator')
    .populate('members')
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results, null, ' '));
    })
});

/*
At the specified URL, returns to the client the list of all the posts currently
saved in the friendconnect database. If no items are found, should display an
empty list.
*/
app.get('/get/posts/', (req, res) => {
  var posts = mongoose.model('Post', PostSchema);
  posts.find({})
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results, null, ' '));
    })
});

/*
At the specified URL, returns to the client the list of all the posts currently
saved in the friendconnect database that were posted by a certain user. If no items
are found, should display an empty list.
*/
app.get('/get/post/:id', (req, res) => {
  var posts = mongoose.model('Post', PostSchema);
  posts.findById(req.params.id)
  .populate('user')
  .exec(function (err, results) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(JSON.stringify(results, null, ' '));
  })
});

/*
At the specified URL, edits the profile of the specified user. Potentially can update
first name, last name, privacy settings, and user bio. Will update the user's
session as well.
*/
app.put('/edit/profile/:id', (req, res) => {
  let profile = JSON.parse(req.body.profile);
  var user = mongoose.model('User', UserSchema);
  user.findById(req.params.id)
  .exec(function (err, results) {
    // updates these fields to whatever was sent by the user in the body of the request
    results.firstName = profile.firstName;
    results.lastName = profile.lastName;
    results.bio = profile.bio;
    results.visibility = profile.vis;
    results.save(function (err) { if (err) console.log('an error occurred'); });
    res.cookie('login', {email: req.cookies.login.email, firstName: profile.firstName,
       key:req.cookies.login.key}, {maxAge: 3600000});
    sessionKeys[req.cookies.login.email][1] = Date.now();
    res.end("");
  })
});

/*
At the specified URL, returns a list of the friends of a specified user. If nothing
is found, should return an empty list.
*/
app.get('/get/friends/:email', (req, res) => {
  var user = mongoose.model('User', UserSchema);
  // searches for email in User collection of objects
  user.find({email : req.params.email})
    .populate('friends')
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results[0].friends, null, ' '));
    })
});

/*
At the specified URL, returns a list of the pending (to be accepted requests) of a
specified user. If nothing is found, should return an empty list.
*/
app.get('/get/friend/requests/:email', (req, res) => {
  var user = mongoose.model('User', UserSchema);
  // searches for email in User collection of objects
  user.find({email : req.params.email})
    .populate('receivedRequests')
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results[0].receivedRequests, null, ' '));
    })
});

/*
At the specified URL, returns a list of the groups a specified user is a member of.
If nothing is found, should return an empty list.
*/
app.get('/get/groups/:email', (req, res) => {
  var user = mongoose.model('User', UserSchema);
  // searches for email in User collection of objects
  user.find({email : req.params.email})
    .populate('groups')
    .exec(function (err, results) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(JSON.stringify(results[0].groups, null, ' '));
    })
});

/*
At the specified URL, returns to the client a list of all the posts that are
visible to a specified user. The posts that should be visible to the user are ones
that are the user's own posts and posts made by the user's friends.
*/
app.get('/get/visible/:email', (req, res) => {
  // searches for user in User collection of objects
  var user = mongoose.model('User', UserSchema);
  // intensely nested population to make accessing the information from these posts
  // easy on the client side
  user.find({email : req.params.email})
    .populate({path: 'posts', populate: [ {path: 'user'}, {path: 'likes', model: 'User'},
      {path: 'comments', model: 'Comment', populate: {path: 'user', model: 'User'}}]})
    .populate({ path: 'posts friends', populate: {path: 'posts', populate: [{path: 'user',
      model: 'User'}, {path: 'likes', model: 'User'}, {path: 'comments', model: 'Comment',
      populate: {path: 'user', model: 'User'}}]}})
    .exec(function (err, results) {
      if (results.length == 0) {
        res.send('No user associated with this name!');
      } else {
        // posts only get added to visible posts if the user is a friend
        let visiblePosts = results[0].posts;
        for (i in results[0].friends) {
          for (j in results[0].friends[i].posts) {
            visiblePosts.push(results[0].friends[i].posts[j]);
          }
        }
        // sorts in order by time (newer posts should be at top / front of list)
        visiblePosts.sort(function(a, b){return b.time-a.time});
        res.setHeader('Content-Type', 'text/plain');
        res.send(JSON.stringify(visiblePosts, null, ' '));
      }
    })
});

/*
Adds a new user into the database. I personally decided to do some error handling
in this function so no 2 users could have the same email (for security purposes).
Additionally, this function is in charge of salting and hashing the password entered by
the user and saving the salt in the hash in the database as opposed to the raw password.
*/
app.post('/add/user/', (req, res) => {
  let user = JSON.parse(req.body.user);
  var userSearch = mongoose.model('User', UserSchema);
  userSearch.find({email : user.email})
    .exec(function (err, results) {
      if (results.length == 0) {
        let password = user.password;
        // beginning of process to salt and hash user password provided
        var salt = crypto.randomBytes(64).toString('base64');
        crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, hash) => {
          if (err) throw err;
          let hashStr = hash.toString('base64');
          // create new UserSchema to add to database
          var addUser = new User({firstName : user.firstName, lastName: user.lastName,
             email: user.email, salt: salt, hash: hashStr, visibility : 'PUBLIC',
             bio: 'Nothing yet!', posts: [], comments: [], groups: [], friends: [],
             sentRequests: [], receivedRequests: [], img: 'img/default.png'});
          addUser.save(function (err) { if (err) console.log('an error occurred'); });
          res.send('Account Created!');
        })
      // don't want two users with the same name
      } else {
        res.send('Account already associated with ' + user.email + '!');
      }
    })
});

/*
Adds a new post into the database. Associates the post with the user who posted it;
this relationship is shared both in the User and the Post Schema (just in case a
reference was needed in either direction).
*/
app.post('/add/post/:email', (req, res) => {
  let postObject = JSON.parse(req.body.post);
  var user = mongoose.model('User', UserSchema);
  // searches for email in User collection of objects
  user.find({email : req.params.email})
    .exec(function (err, results) {
      if (results.length == 0) {
        res.send('Email not in system!');
      } else {
        var post = new Post(postObject);
        post.user = results[0]._id;
        post.save(function (err) { if (err) console.log('an error occurred'); });
        // need to push item._id into posts to keep reference to it
        results[0].posts.push(post._id);
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      }
    })
});

/*
Adds a new group into the database. Adds the user who created the group as the creator
and then pushes the user as one of the members of the group as well. A user can be
a creator, but not be a member of the group they created.
*/
app.post('/add/group/:email', (req, res) => {
  let groupObject = JSON.parse(req.body.group);
  var user = mongoose.model('User', UserSchema);
  // searches for email in User collection of objects
  user.find({email : req.params.email})
    .exec(function (err, results) {
      if (results.length == 0) {
        res.send('Email not in system!');
      } else {
        var group = new Group(groupObject);
        group.creator = results[0]._id;
        group.members.push(results[0]._id);
        group.save(function (err) { if (err) console.log('an error occurred'); });
        // need to push item._id into groups to keep reference to it
        results[0].groups.push(group._id);
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      }
    })
});

/*
Adds a new comment into the database. Associates the comment with the user who posted it;
this relationship is shared both in the User and the Comment Schema (just in case a
reference was needed in either direction).
*/
app.post('/add/comment/:email/:id', (req, res) => {
  let commentObject = JSON.parse(req.body.comment);
  var posts = mongoose.model('Post', PostSchema);
  posts.findById(req.params.id, function (err, results) {
    var post = results;
    var user = mongoose.model('User', UserSchema);
    // searches for email in User collection of objects
    user.find({email : req.params.email})
      .exec(function (err, results) {
        if (results.length == 0) {
          res.send('Email not in system!');
        } else {
          var comment = new Comment(commentObject);
          comment.post = post._id;
          comment.user = results[0]._id;
          post.comments.push(comment._id);
          // need to push item._id into comments to keep reference to it
          results[0].comments.push(comment._id);
          comment.save(function (err) { if (err) console.log('an error occurred'); });
          post.save(function (err) { if (err) console.log('an error occurred'); });
          results[0].save(function (err) { if (err) console.log('an error occurred'); });
          res.cookie('login', {email: req.cookies.login.email, firstName:
            req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
          sessionKeys[req.cookies.login.email][1] = Date.now();
          res.end("");
        }
      })
   })
});

/*
Adds a specified user as a liker of a specified post. The relationship of liked post
and liker is shared between User and Post Schema (just in case a reference is needed
in either direction).
*/
app.put('/like/post/:email/:id', (req, res) => {
  var posts = mongoose.model('Post', PostSchema);
  posts.findById(req.params.id, function (err, results) {
    var post = results;
    var user = mongoose.model('User', UserSchema);
    user.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam liking in UI
        if (!(post.likes.includes(results[0]._id, 0))) {
          post.likes.push(results[0]._id);
          post.save(function (err) { if (err) console.log('an error occurred'); });
          // update cookie so user now has more time -> active
          res.cookie('login', {email: req.cookies.login.email, firstName:
            req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
          sessionKeys[req.cookies.login.email][1] = Date.now();
          res.end("");
        }
      });
  });
});

/*
Edits a specified post with the content supplied in the body of the request (which
should be the updated content of the post).
*/
app.put('/edit/post/:id', (req, res) => {
  let profile = JSON.parse(req.body.bio);
  var posts = mongoose.model('Post', PostSchema);
  posts.findById(req.params.id, function (err, results) {
    results.content = profile.bio;
    results.save(function (err) { if (err) console.log('an error occurred'); });
    res.end("");
  });
});

/*
Unadds a specified user as a liker of a specified post. The relationship of liked post
and liker is shared between User and Post Schema (just in case a reference is needed
in either direction).
*/
app.delete('/unlike/post/:email/:id', (req, res) => {
  var posts = mongoose.model('Post', PostSchema);
  posts.findById(req.params.id, function (err, results) {
    var post = results;
    var user = mongoose.model('User', UserSchema);
    user.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam liking in UI
        if (post.likes.includes(results[0]._id, 0)) {
          let index = post.likes.indexOf(results[0]._id);
          post.likes.splice(index, 1);
          post.save(function (err) { if (err) console.log('an error occurred'); });
          // update cookie so user now has more time -> active
          res.cookie('login', {email: req.cookies.login.email, firstName:
            req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
          sessionKeys[req.cookies.login.email][1] = Date.now();
          res.end("");
        }
      });
  });
});

/*
Causes a user to join a specified group. The relationship of group member and group
is shared between User and Group Schema (just in case a reference is needed
in either direction).
*/
app.put('/join/group/:email/:id', (req, res) => {
  var groups = mongoose.model('Groups', GroupSchema);
  groups.findById(req.params.id, function (err, results) {
    var group = results;
    var users = mongoose.model('User', UserSchema);
    users.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam joining in UI
        if (!(group.members.includes(results[0]._id, 0))) {
          group.members.push(results[0]._id);
        }
        if (!(results[0].groups.includes(req.params.id, 0))) {
          results[0].groups.push(req.params.id);
        }
        group.save(function (err) { if (err) console.log('an error occurred'); });
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      });
  });
});

/*
Causes a user to unjoin a specified group. The relationship of group member and group
is shared between User and Group Schema (just in case a reference is needed
in either direction).
*/
app.delete('/leave/group/:email/:id', (req, res) => {
  var groups = mongoose.model('Groups', GroupSchema);
  groups.findById(req.params.id, function (err, results) {
    var group = results;
    var users = mongoose.model('User', UserSchema);
    users.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam unjoining in UI
        if (group.members.includes(results[0]._id, 0)) {
          let index = group.members.indexOf(results[0]._id);
          group.members.splice(index, 1);
        }
        if (results[0].groups.includes(req.params.id, 0)) {
          let index = results[0].groups.indexOf(req.params.id);
          results[0].groups.splice(index, 1);
        }
        group.save(function (err) { if (err) console.log('an error occurred'); });
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      });
  });
});

/*
Accepts a pending friend request sent to a specified user. Removes requests from
received and sent requests, and both users involved are friends with each other
(change should be reflected in client).
*/
app.put('/accept/request/:email/:id', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.findById(req.params.id, function (err, results) {
    var userReq = results;
    users.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam requesting in UI
        if (userReq.sentRequests.includes(results[0]._id, 0)) {
          let index = userReq.sentRequests.indexOf(results[0]._id);
          userReq.sentRequests.splice(index, 1);
          userReq.friends.push(results[0]._id);
        }
        if (results[0].receivedRequests.includes(req.params.id, 0)) {
          let index = results[0].receivedRequests.indexOf(req.params.id);
          results[0].receivedRequests.splice(index, 1);
          results[0].friends.push(req.params.id);
        }
        userReq.save(function (err) { if (err) console.log('an error occurred'); });
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      });
  });
});

/*
Removes a user (friend) of another specified user. Removes requests from
friend lists, and both users are not friends; however, can send
another friend request if you want.
*/
app.delete('/unfriend/:email/:id', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.findById(req.params.id, function (err, results) {
    var userReq = results;
    users.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam requesting in UI
        if (userReq.friends.includes(results[0]._id, 0)) {
          let index = userReq.friends.indexOf(results[0]._id);
          userReq.friends.splice(index, 1);
        }
        if (results[0].friends.includes(req.params.id, 0)) {
          let index = results[0].friends.indexOf(req.params.id);
          results[0].friends.splice(index, 1);
        }
        userReq.save(function (err) { if (err) console.log('an error occurred'); });
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      });
  });
});

/*
Declines a pending friend request sent to a specified user. Removes requests from
received and sent requests, and both users are not friends; however, can send
another friend request if you want.
*/
app.put('/decline/request/:email/:id', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.findById(req.params.id, function (err, results) {
    var userReq = results;
    users.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam requesting in UI
        if (userReq.sentRequests.includes(results[0]._id, 0)) {
          let index = userReq.sentRequests.indexOf(results[0]._id);
          userReq.sentRequests.splice(index, 1);
        }
        if (results[0].receivedRequests.includes(req.params.id, 0)) {
          let index = results[0].receivedRequests.indexOf(req.params.id);
          results[0].receivedRequests.splice(index, 1);
        }
        userReq.save(function (err) { if (err) console.log('an error occurred'); });
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      });
  });
});

/*
Sends a friend request to a specified user. Adds request made to corresponding sent
and received requests lists. Updates UI to show friend request has occurred.
*/
app.put('/send/request/:email/:id', (req, res) => {
  var users = mongoose.model('User', UserSchema);
  users.findById(req.params.id, function (err, results) {
    var userReq = results;
    users.find({email : req.params.email})
      .exec(function(err, results) {
        // prevent user from spam purchasing in UI
        if (!(userReq.receivedRequests.includes(results[0]._id, 0))) {
          userReq.receivedRequests.push(results[0]._id);
        }
        if (!(results[0].sentRequests.includes(req.params.id, 0))) {
          results[0].sentRequests.push(req.params.id);
        }
        userReq.save(function (err) { if (err) console.log('an error occurred'); });
        results[0].save(function (err) { if (err) console.log('an error occurred'); });
        // update cookie so user now has more time -> active
        res.cookie('login', {email: req.cookies.login.email, firstName:
          req.cookies.login.firstName, key:req.cookies.login.key}, {maxAge: 3600000});
        sessionKeys[req.cookies.login.email][1] = Date.now();
        res.end("");
      });
  });
});

/*
Verifies that the credentials (the email & pass used) to log in with are valid (password is
actually associated with this email and user exists). If email and password are
good, user should be redirected to home.html. If not good, error message is
displayed on HTML. Creates cookie if the user logs in as well.
*/
app.get('/login/:email/:password', (req, res) => {
  var user = mongoose.model('User', UserSchema);
  user.find({email : req.params.email})
    .exec(function(error, results) {
      if (results.length == 1) {
        let password = req.params.password;
        // retrieves salt to perform pbkdf2 on password
        var salt = results[0].salt;
        crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, hash) => {
          if (err) throw err;
          let hashStr = hash.toString('base64');
          // check if hash is == to hashStr that was saved to the database
          if (results[0].hash == hashStr) {
            // creates a new session cookie to keep track of
            let sessionKey = Math.floor(Math.random() * 10000);
            sessionKeys[req.params.email] = [sessionKey, Date.now()];
            res.cookie('login', {email: req.params.email, firstName: results[0].firstName,
               key:sessionKey}, {maxAge: 3600000});
            res.send('OK');
          } else {
            res.send('BAD');
          }
      })
    } else {
      res.send('BAD');
    }
  })
});

/*
This is the multer request path that is in charge of uploading an image file that
the user submitted on the server to the directory 'uploads/images'. This function
also ensures the user is redirected back to the home page after the image is
uploaded to the server. ** ACTUALLY WORKS THIS TIME **
*/
app.post('/upload', upload.single('photo'), (req, res) => {
  if (req.file) {
    var user = mongoose.model('User', UserSchema);
    user.find({email : req.cookies.login.email})
      .exec(function(error, results) {
        var img = fs.readFileSync(req.file.path);
        var encode_image = img.toString('base64');
        // create img object to save to the database
        var finalImg = {
          contentType: req.file.mimetype,
          image:  new Buffer(encode_image, 'base64')
        };
        // insert image into the database & update profile pic of user
        db.collection('quotes').insertOne(finalImg, (err, result) => {
          results[0].img = '/photo/' + result.insertedId;
          results[0].save(function (err) { if (err) console.log('an error occurred'); });
          if (err) return console.log(err)
          res.redirect('/home.html');
        })
      });
  } else {
    res.redirect('/home.html');
  }
});

/*
Retrieves rendered image of the buffer string that was stored in the
friendconnect database. The image that is returned is a profile picture of
a user in the database.
*/
app.get('/photo/:id', (req, res) => {
  var filename = req.params.id;
  db.collection('quotes').findOne({'_id': ObjectId(filename) }, (err, result) => {
    if (err) return console.log(err)
    res.contentType('image/jpeg');
    res.send(result.image.buffer);
  })
});

/*
This function clears the current cookie, which logs the user out of the session they
are currently in. The message that gets sent back is alerted to the user.
*/
app.get('/logout', (req, res) => {
  delete sessionKeys[req.cookies.login.email];
  res.clearCookie('login');
  res.send('Logged Out!');
});

/*
Code that is run when the server starts up. Displays the address the server is
running at.
*/
app.listen(port, () => {
  console.log(`App listening at http://127.0.0.1:${port}`)});
