/*
Author: Samantha Cox
File: code-home.js
Description: This provides the functionality for home.html. Provides functionality
for viewing feed, adding posts, adding comments, liking and unliking posts,
editing posts, creating groups, joining groups, leaving groups, editing your profile,
adding a profile picture, sending, receiving, and declining friend requests, and
unfriending peopled. Additionally, has features on page that are frequently updated
(friend list, friend requests, groups) so that the user is aware of some information
at the real-time it is occurring. A lot of functions are just specifically for
manipulating the DOM on home.html.
*/

/*
Performs an AJAX request to add a new post to the friendconnect database. Creates a post
object and uses JSON to stringify the object to be parsed by the server. Returns back
to main posts page after request is made.
*/
function addPost() {
  let bio = $('#bio').val();
  let time = new Date().getTime();

  // based on cookie, knows who current user in session is
  var user = decodeURIComponent(document.cookie);
  if (user != '') {
    user = JSON.parse(user.replace('login=j:', ''));

    // create post object to send in AJAX request
    let post = {time: time, user: {}, content: bio, comments: [], likes: []};
    let postAdd = JSON.stringify(post);

    // send AJAX request to server
    $.ajax({
      url: '/add/post/' + user.email,
      data: {post: postAdd},
      method: 'POST',
      success: function (result) {
        viewPosts();
      }
    });
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to add a new group to the friendconnect database. Creates a group
object and uses JSON to stringify the object to be parsed by the server. Returns back
to main posts page after request is made.
*/
function addGroup() {
  let bio = $('#bio').val();
  let title = $('#nameGroup').val();

  // based on cookie, knows who current user in session is
  var user = decodeURIComponent(document.cookie);
  if (user != '') {
    user = JSON.parse(user.replace('login=j:', ''));

    // create group object to send in AJAX request
    let group = {name: title, creator: {}, bio: bio, members: []};
    let groupAdd = JSON.stringify(group);

    // send AJAX request to server
    $.ajax({
      url: '/add/group/' + user.email,
      data: {group: groupAdd},
      method: 'POST',
      success: function (result) {
        viewPosts();
      }
    });
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Displays the greeting to the user on home.html. Uses document.cookie to access
current cookie content to display who the user is. NOTE: I'm not sure if
localStorage would have been a better approach, but this seemed to make more
sense since we're dealing with cookies and user sessions.
*/
function greetUser() {
  let greeting = $('#welcomeMess');

  // based on cookie, knows who current user in session is
  var result = decodeURIComponent(document.cookie);
  result = JSON.parse(result.replace('login=j:', ''));

  greeting.html("<b>Welcome, " + result.firstName + "!</b>");
}

/*
Updates the HTML displayed to the user on the main feed of home.html. Here,
for each post, the timestamp, content and user who posted the post are displayed.
Additionally, if there are any comments, those are displayed directly under the posts on
the feed.

@param result is the httpResponse from AJAX requests dealing with returning posts
*/
function updateFeed(result) {
  let posts = $('#visiblePosts');
  let message = $('#topFeed')
  // parse result returned
  var results = JSON.parse(result);
  var result = '';
  for (var i in results) {
    let time = new Date(results[i].time);
    // convert milliseconds saved to a normal time stamp
    let num = time.toLocaleTimeString('en-US');
    let date = time.toLocaleDateString();
    result += '<div class="post"><b>Post By: ' + results[i].user.firstName + ' ' +
      results[i].user.lastName + '</b><div id="time">' + '     ' + num + ' ' + date +
      '</div><br/>' + results[i].content + '<br/><br/>' + detStatus(results[i].user.email,
         results[i]._id, results[i].likes) + '<br/>' + detLikes(results[i].likes) + '</div>';
    result += addComments(results[i].comments);
    result += '<br/><br/>';
  }
  posts.html(result);
  message.html('<input class="otherBut" onclick="viewPosts(); autoScroll();" type="button"' +
    'value="Refresh & ' + 'Return to Top of Feed" />')
}

/*
Concatenates an HTML string together to make the comments display on the main feed
attached underneath the post they are attached to. It's possible an empty string is
returned if there are no comments.

@param comments are the comments that are attached to a specific post
@return HTML representing the comments section of the post (if there are any)
*/
function addComments(comments) {
  let retVal = "";
  if (comments.length > 0) {
    retVal += '<div id="commHead">See Comments Below</div>';
    for (var j in comments) {
      let time = new Date(comments[j].time);
      // convert milliseconds saved to a normal time stamp
      let num = time.toLocaleTimeString('en-US');
      let date = time.toLocaleDateString();
      retVal += '<div class="comment"><b>' +
        comments[j].user.firstName + ' ' + comments[j].user.lastName +
        '</b><div id="time">' + '     ' + num + ' ' + date + '</div><br/>' +
        comments[j].content + '</div>';
    }
  }
  return retVal;
}

/*
Concatenates an HTML string together to attach the names of the likers to a particular
post (so if you liked a post, it is displayed to others). It's possible an empty string is
returned if there are no comments.

@param likes are the likes that are attached to a specific post
@return HTML representing the likes section of the post (if there are any)
*/
function detLikes(likes) {
  let retVal = "";
  if (likes.length > 0) {
    retVal += '<div id="likers">Liked By: ';
    for (var j in likes) {
      retVal += likes[j].firstName + ' ' + likes[j].lastName + ", ";
    }
    retVal += '</div>';
  }
  return retVal;
}

/*
Determines what the status is for a specified post. The "status" in this sense are
the buttons displayed to the user. If the post is a user's own, should have the
option to edit the post. If a post is liked / unliked, displays a different button.
All posts should have a comment button / option to be commented.

@param email is the email address of the post user
@param id is the _id attribute of the item
@param likes are the likers of the post
*/
function detStatus(email, id, likes) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  var res = '<div id="actions">'
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    if (email == object.email) {
      res += '<span><input class="postButtons ' + id + '" onclick="editPost(this.className);' +
      '" type="button' + '" value="' + 'Edit"' + ' /></span>';
    }
    // checks if post is liked, returns different button if it is
    if (inLikes(likes, object.email)) {
      res += '<span><input class="postButtons ' + id + '" onclick="unlikePost(this.className);' +
          '" type="button' + '" value="' + 'Unlike"' + ' /></span>';
    } else {
      res += '<span><input class="postButtons ' + id +  '" onclick="likePost(this.className);' +
          '" type="button' + '" value="' + 'Like"' + ' /></span>';
    }

    res += '<span><input class="postButtons ' + id + '" onclick="commPost(this.className);' +
        '" type="button' + '" value="' + 'Comment"' + ' /></span>';
  }
  res += '</div>';
  return res;
}

/*
Checks if specified email address is in likes for the post.

@param likes are the likers of the post
@param email the email address of the post user
@return boolean representing if email is in likes list
*/
function inLikes(likes, email) {
  for (var i in likes) {
    if (email == likes[i].email) {
      return true;
    }
  }
  return false;
}

/*
Performs an AJAX request to return the list of posts visible to user. Posts that
are visible to users include the user's friends and the user's own posts. Updates
the DOM displayed on the home page.
*/
function viewPosts() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/visible/' + object.email,
      method: 'GET',
      success: function (result) {
        updateFeed(result);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to return the list of all of the users in the friendconnect
database. Calls updateProfiles() to generate an HTML string to update the DOM with.
*/
function viewPeople() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/users/',
      method: 'GET',
      success: function (result) {
        updateProfiles(result);
        let message = $("#topFeed");
        message.html('<span><input class="otherBut" onclick="viewPosts(); autoScroll();"' +
          'type="button"' + 'value="Return to Feed" /></span' + '<span><input class="otherBut"' +
          'onclick="viewPeople(); autoScroll();" type="button"' +
          'value="Refresh Profiles Page" /></span')
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to return the list of all of the groups in the friendconnect
database. Calls updateGroups() to generate an HTML string to update the DOM with.
*/
function viewGroups() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/groups/',
      method: 'GET',
      success: function (result) {
        updateGroups(result);
        let message = $("#topFeed");
        message.html('<span><input class="otherBut" onclick="viewPosts(); autoScroll();"' +
          'type="button"' + 'value="Return to Feed" /></span' + '<span><input class="otherBut"' +
          'onclick="viewGroups(); autoScroll();" type="button"' +
          'value="Refresh Groups Page" /></span')
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Returns an HTML string back to the DOM with the updated group information to display
to the user. Displays all the groups that are currently in the database.

@result JSON returned from the server representing group data
*/
function updateGroups(result) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    let feed = $('#visiblePosts');

    let results = JSON.parse(result);
    result = '';
    for (var i in results) {
      result += '<div class="group"><div><b><i>Group: ' + results[i].name +
        '</i></b></div><br/><div><b><i>Created By: ' + results[i].creator.firstName + ' ' +
        results[i].creator.lastName + '</i></b></div><br/><div><b><i>Group Bio</i></b></div>' +
        results[i].bio;
      // depending if member, have option to leave or join the group
      if (checkMember(results[i].members, object.email)) {
        result += '<br/><br/><div><input class="postButtons" id="' + results[i]._id +
        '" onclick="leaveGroup(this.id); clickedGroup();' + '" type="button' + '" value="' +
        'Leave Group"' + ' /></div>';
      } else {
        result += '<br/><br/><div><input class="postButtons" id="' + results[i]._id +
        '" onclick="joinGroup(this.id); clickedGroup();' + '" type="button' + '" value="' +
        'Join Group"' + ' /></div>';
      }

      if (results[i].members.length > 0) {
        result += '<br/><div id="members">Members: ';
        for (var j in results[i].members) {
           result += results[i].members[j].firstName + ' ' + results[i].members[j].lastName +
           ", ";
        }
        result += '</div>';
      }
      result += '</div><br/><br/>';
    }
    feed.html(result);
  }
}

/*
Returns an HTML string back to the DOM with the updated user information to display
to the user. Displays all the users that are currently in the database.

@result JSON returned from the server representing profile data
*/
function updateProfiles(result) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    let feed = $('#visiblePosts');

    let results = JSON.parse(result);
    result = '';
    for (var i in results) {
      result += '<div class="person"><div><b><i>' + results[i].firstName
       + ' ' + results[i].lastName + '</i></b></div><br/>' + '<img src="' + results[i].img +
       '" id="' + results[i].img + '" ' + 'alt="default pic" width="60%" />' +
       '<div><b><i>User Bio</i></b></div>';
       if (object.email == results[i].email) {
         result += results[i].bio + '<br/><br/><div><i>This is Your Profile</i></div>' +
         '</div><br/><br/>';
       // if friends, have option to potentially unfriend the user
       } else if (checkFriends(results[i].friends, object.email)) {
         result += results[i].bio + '<br/><br/><div><input class="postButtons" id="' +
         results[i]._id + '" onclick="unfriend(this.id); clicked();' + '" type="button' +
         '" value="' + 'Unfriend"' + ' /></div>' + '</div><br/><br/>';
       } else {
         if (results[i].visibility == "PRIVATE") {
           result += 'PRIVATE ACCOUNT';
         } else {
           result += results[i].bio;
         }
         // check outgoing & incoming friend requests
         if (checkOutgoing(results[i].sentRequests, object.email)) {
           result += '<br/><br/><span><input class="postButtons" id="' + results[i]._id +
            '" onclick="acceptReq(this.id); clicked();' + '" type="button' + '" value="' +
            'Accept Friend Request"' + ' /></span>' + '<span><input class="postButtons" id="' +
            results[i]._id + '" onclick="declineReq(this.id); clicked();' + '" type="button' +
            '" value="' + 'Decline Friend Request"' + ' /></span>' + '</div><br/><br/>';
         } else if (checkIncoming(results[i].receivedRequests, object.email)) {
           result += '<br/><br/><div>PENDING RESPONSE</div>' + '</div><br/><br/>';
         } else {
           result += '<br/><br/><div><input class="postButtons" id="' + results[i]._id +
           '" onclick="friendReq(this.id); clicked();' + '" type="button' + '" value="' +
           'Send Friend Request"' + ' /></div>' + '</div><br/><br/>';
         }
      }
    }
    feed.html(result);
  }
}

/*
Unfortunately, to properly update the DOM to reflect the change instantaneously
when a user likes / unlikes a post, viewPeople() needed to be called twice.
*/
function clicked() {
  viewPeople();
  viewPeople();
}

/*
Unfortunately, to properly update the DOM to reflect the change instantaneously
when a user joins / unjoins a group, viewGroups() needed to be called twice.
*/
function clickedGroup() {
  viewGroups();
  viewGroups();
}

/*
Unfortunately, to properly update the DOM to reflect the change instantaneously
when a user updates their profile, viewPosts() needed to be called twice.
*/
function updatedProf() {
  viewPosts();
  viewPosts();
}

/*
Performs an AJAX request to accept a specified user's friend request that was sent.

@param id represents the id of the user whose friend request is being responded to
*/
function acceptReq(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    //send AJAX request to server
    $.ajax({
      url: '/accept/request/' + object.email + '/' + id,
      method: 'PUT'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to decline a specified user's friend request that was sent.

@param id represents the id of the user whose friend request is being responded to
*/
function declineReq(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    //send AJAX request to server
    $.ajax({
      url: '/decline/request/' + object.email + '/' + id,
      method: 'PUT'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request for a user to unfriend one of their friends. Can only
unfriend people if they're already friends as well.

@param id represents the id of the user whose friend request is being responded to
*/
function unfriend(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    //send AJAX request to server
    $.ajax({
      url: '/unfriend/' + object.email + '/' + id,
      method: 'DELETE'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request for a user to send a friend request to another person. Can
only send friend requests to people if you're not friends already.

@param id represents the id of the user who is being sent a friend request
*/
function friendReq(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    //send AJAX request to server
    $.ajax({
      url: '/send/request/' + object.email + '/' + id,
      method: 'PUT'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to retrieve a user's profile image. By default, the user is
given an empty profile image (gray person); however if the user uploads an image, the
img attribute in the Schema is updated to reflect a get request to this path.

@param id represents the id of the user who is having prof pic fetched
*/
function getImg(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/img/' + object.email,
      method: 'GET',
      success: function (result) {
        result = JSON.parse(result)
        $('#img').attr('src', result);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request for a user to join a group (when Join Group button is
clicked). Added as a member to the group they joined.

@param id represents the id of the group the user is joining
*/
function joinGroup(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    //send AJAX request to server
    $.ajax({
      url: '/join/group/' + object.email + '/' + id,
      method: 'PUT'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request for a user to leave a group (when Leave Group button is
clicked). Removed as a member to the group they left.

@param id represents the id of the group the user is leaving
*/
function leaveGroup(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    //send AJAX request to server
    $.ajax({
      url: '/leave/group/' + object.email + '/' + id,
      method: 'DELETE'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Checks if a specified user is in another user's friends list.


@param friends represents list of people to check through for validation
@param email represents the email to be searched for in friends
@return boolean that states whether someone is in another person's friends list
*/
function checkFriends(friends, email) {
  for (var i in friends) {
    if (friends[i].email == email) {
      return true;
    }
  }
  return false;
}

/*
Checks if a specified user is in another user's outgoing friend requests list.

@param friends represents list of people to check through for validation
@param email represents the email to be searched for in friends
@return boolean that states whether someone is in another person's outgoing friend request list
*/
function checkOutgoing(friends, email) {
  for (var i in friends) {
    if (friends[i].email == email) {
      return true;
    }
  }
  return false;
}

/*
Checks if a specified user is in another user's incoming friend requests list.

@param friends represents list of people to check through for validation
@param email represents the email to be searched for in friends
@return boolean that states whether someone is in another person's incoming friend request list
*/
function checkIncoming(friends, email) {
  for (var i in friends) {
    if (friends[i].email == email) {
      return true;
    }
  }
  return false;
}

/*
Checks if a specified user is a member of a particular group.

@param members represents list of people to check through for validation
@param email represents the email to be searched for in members
@return boolean that states whether someone is a member of a specified group
*/
function checkMember(members, email) {
  for (var i in members) {
    if (members[i].email == email) {
      return true;
    }
  }
  return false;
}

/*
Automatically scrolls the scrollbar in the main feed back up to the top of the page
when called.
*/
function autoScroll() {
  $('#mainFeed').scrollTop(0);
}

/*
Displays all of the user's friends on the right side bar underneath Your Friends.
Performs AJAX request to fetch this information.
*/
function viewFriends() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/friends/' + object.email,
      method: 'GET',
      success: function (result) {
        let friends = $('#friends');
        //updates right side bar with friend info
        let results = JSON.parse(result);
        result = '';
        for (var i in results) {
          result += '<div>' + results[i].firstName + ' ' + results[i].lastName + '</div>';
        }
        friends.html(result);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
    // if not cleared, the alert message acts kind of wonky
    clearInterval(friendInt);
    clearInterval(reqInt);
    clearInterval(groupInt);
    clearInterval(greetInt);

    alert('You have been timed out!');
  }
}

/*
Displays all of the user's friend requests  on the right side bar underneath Your
Friend Requests. Performs AJAX request to fetch this information.
*/
function viewRequests() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/friend/requests/' + object.email,
      method: 'GET',
      success: function (result) {
        let requests = $('#requests');
        //updates right side bar with friend request info
        let results = JSON.parse(result);
        result = '';
        for (var i in results) {
          result += '<div>' + results[i].firstName + ' ' + results[i].lastName + '</div>'
          + '<span><input class="but" id="' + results[i]._id + '" onclick="acceptReq(this.id);' +
          '" type="button' + '" value="' + 'Accept Friend Request"' + ' /></span>' +
          '<span><input class="but" id="' + results[i]._id + '" onclick="declineReq(this.id);' +
          '" type="button' + '" value="' + 'Decline Friend Request"' + ' /></span>' +
          '</div><br/>';
        }
        requests.html(result);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Displays all of the user's groups on the right side bar underneath Your
Groups. Performs AJAX request to fetch this information.
*/
function viewGroupsIn() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/groups/' + object.email,
      method: 'GET',
      success: function (result) {
        let groups = $('#groups');
        //updates right side bar with group info
        let results = JSON.parse(result);
        result = '';
        for (var i in results) {
          result += '<div>' + results[i].name + '</div>';
        }
        groups.html(result);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
When the user clicks Create a New Post, updates the DOM to an interface that allows
a user to create a New Post on their Feed. Includes a text area and a button to click
when done making a post.
*/
function toPost() {
  let message = $('#topFeed');
  let feed = $('#visiblePosts');
  let result = '<div class="create"><div>Make a New Post to Your Wall</div><br/>' +
    '<textarea name="bio" id="bio" placeholder="What' + "'" +
    's going on?" rows ="12" cols="60"></textarea>' + '<br/><input class="otherBut"' +
    'onclick="addPost();"' + 'type="button"' + 'value="Create Post"' + '/></div>';
  feed.html(result);
  message.html('<input class="otherBut" onclick="viewPosts(); autoScroll();" type="button"' +
    'value="Return Back to Your Feed" />');
}

/*
When the user clicks Create a New Group, updates the DOM to an interface that allows
a user to create a New Group for others to interact with. Includes a text area and a
button to click when done describing the group for others to view and interact with.
*/
function toGroup() {
  let message = $('#topFeed');
  let feed = $('#visiblePosts');
  let result = '<div class="create"><div>Make a New Group</div><br/>' +
    '<label for="nameGroup">Group Name    </label>' +
    '<input type="text" name="nameGroup" id="nameGroup" /><br/><br/>' +
    '<textarea name="bio" id="bio" placeholder="Write a description of your group here..."' +
    'rows ="12" cols="60"></textarea>' + '<br/><input class="otherBut"' +
    'onclick="addGroup();"' + 'type="button"' + 'value="Create Group"' + '/></div>';
  feed.html(result);
  message.html('<input class="otherBut" onclick="viewPosts(); autoScroll();" type="button"' +
    'value="Return Back to Your Feed" />');
}

/*
When the user clicks Edit Profile, updates the DOM to an interface that allows
a user to edit their profile. Includes a text area for a bio, text inputs for
first and last name, and a button to click when done editing profile. Additionally,
the user can upload a profile picture to the server to show off who they are!
*/
function toProfile() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/get/user/' + object.email,
      method: 'GET',
      success: function (result) {
        let message = $('#topFeed');
        let user = JSON.parse(result);
        let feed = $('#visiblePosts');
        let newIn = '<div class="create"><div>Edit Profile</div><br/>' +
          '<label for="first">First Name    </label>' +
          '<input type="text" name="first" id="first" value="' + user[0].firstName +
          '" /><br/><br/>' + '<label for="last">Last Name    </label>' +
          '<input type="text" name="last" id="last" value="' + user[0].lastName +
          '" /><br/><br/>' + '<div>Your Bio</div><br/>' +
          '<textarea name="bio" id="bio" rows ="12" cols="60">' + user[0].bio + '</textarea>' +
          '<br/><br/>' + detPrivacy(user[0].visibility) + '<input class="otherBut ' +
          user[0]._id + '" onclick="editProfile(this.className); updatedProf();"'
          + 'type="button"' + 'value="Submit to Save Changes"' + '/><br/><br/>' +
          '<div>Upload Profile Picture</div></div><br/>';
        // upload a picture to the server
        newIn += '<form action="/upload" method="post" enctype="multipart/form-data">' +
          '<input type="file" accept="image/*" name="photo" id="photo">' +
          '<input type="submit" value="Upload Profile Picture"></form>';
        feed.html(newIn);
        message.html('<input class="otherBut" onclick="viewPosts(); autoScroll();" type="button"'
          + 'value="Return Back to Your Feed" />');
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
When a user submits the edit request to edit their profile, they are taken back to
the posts page. Aa AJAX request is made to the server to modify the current user info
with the newly entered information by the user.

@param id represents the id of user that is being updated
*/
function editProfile(id) {
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");
    let bio = $('#bio').val();
    let firstName = $('#first').val();
    let lastName = $('#last').val();
    let radios = document.getElementsByName('settings');
    if (radios[0].checked) {
      var visibility = 'PUBLIC';
    } else {
      var visibility = 'PRIVATE';
    }
    // create user object to send over in PUT body
    let user = {firstName: firstName, lastName: lastName, bio: bio, vis: visibility};
    let userAdd = JSON.stringify(user);

    //send AJAX request to server
    $.ajax({
      url: '/edit/profile/' + ids[1],
      data: {profile: userAdd},
      method: 'PUT'
    });
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Depending on the privacy setting of the user, checks a certain radio box by default.
If account is public, public is checked and vice versa.

@param privacy represents the privacy setting of the user in the database
@return HTML string representing privacy radio buttons
*/
function detPrivacy(privacy) {
  if (privacy == 'PUBLIC') {
    return '<div>Privacy Settings</div><br/>' + '<div id="privacy"><label for="public">PUBLIC' +
    '</label>' + '<input type="radio" name="settings" id="public" value="PUBLIC" checked />' +
    '<label for="private">PRIVATE </label>' +
    '<input type="radio" name="settings" id="private" value="PRIVATE" /></div><br>';
  } else {
    return '<div>Privacy Settings</div><br/>' + '<div id="privacy"><label for="public">PUBLIC' +
    '</label>' + '<input type="radio" name="settings" id="public" value="PUBLIC" />' +
    '<label for="private">PRIVATE </label>' +
    '<input type="radio" name="settings" id="private" value="PRIVATE" checked /></div><br>';
  }
}

/*
Performs an AJAX request to like a post in the friendconnect database. When a post is liked, the
server should "refresh" the DOM to reflect this change.

@param id represents the post that was liked
*/
function likePost(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");

    //send AJAX request to server
    $.ajax({
      url: '/like/post/' + object.email + '/' + ids[1],
      method: 'PUT'
    });
    viewPosts();
    viewPosts();
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to unlike a post in the friendconnect database. When a post is
unliked, the server should "refresh" the DOM to reflect this change.

@param id represents the post that was unliked
*/
function unlikePost(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");

    //send AJAX request to server
    $.ajax({
      url: '/unlike/post/' + object.email + '/' + ids[1],
      method: 'DELETE'
    });
    viewPosts();
    viewPosts();
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to update the DOM with an interface that allows the user to
edit their old post with the content of the old post inside of the text area on the
screen the user is provided with to edit / type their post in.

@param id represents the post to be edited
*/
function editPost(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");

    // send AJAX request to server
    $.ajax({
      url: '/get/post/' + ids[1],
      method: 'GET',
      success: function (result) {
        let post = JSON.parse(result);
        let feed = $('#visiblePosts');
        let newIn = '<div class="create"><div>Edit Old Post</div><br/>' +
          '<textarea name="bio" id="bio" rows ="12" cols="60">' + post.content +'</textarea>' +
          '<br/><input class="otherBut ' + id + '" onclick="editRequest(this.className);"' +
          'type="button"' + 'value="Edit Post"' + '/></div>';
        feed.html(newIn);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to logout the user out of their current session. This involves
clearing the cookie in the server and removing the user from the sessionKeys in the
server as well.
*/
function logout() {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));

    // send AJAX request to server
    $.ajax({
      url: '/logout',
      method: 'GET',
      success: function (result) {
        // need to clear or alert message gets stuck in infinte loop
        clearInterval(friendInt);
        clearInterval(reqInt);
        clearInterval(groupInt);
        clearInterval(greetInt);

        alert(result);
        let url = '/index.html';
        window.location = url;
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to update the database with the newly edited post content
provided by the user.

@param id represents the post that was edited
*/
function editRequest(id) {
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");
    let bio = $('#bio').val();
    // bio object to put through body of request
    let user = {bio: bio};
    let userAdd = JSON.stringify(user);

    //send AJAX request to server
    $.ajax({
      url: '/edit/post/' + ids[2],
      data: {bio: userAdd},
      method: 'PUT'
    });
    viewPosts();
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to update the DOM with an interface that allows the user to
comment on a post with the content of the post above of the text area on the
screen the user is provided with to edit / type their post in.

@param id represents the post that is being commented on
*/
function commPost(id) {
  // based on cookie, knows who current user in session is
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");

    // send AJAX request to server
    $.ajax({
      url: '/get/post/' + ids[1],
      method: 'GET',
      success: function (result) {
        let post = JSON.parse(result);
        let feed = $('#visiblePosts');
        let newIn = '<div class="create"><div>Comment on what ' + post.user.firstName + ' ' +
          post.user.lastName +' said!</div><br/><div>Responding to: ' + post.content +
          '</div><br/>' + '<textarea name="bio" id="bio" rows ="12" cols="60"></textarea>' +
          '<br/><input class="otherBut ' + id + '" onclick="commRequest(this.className);"' +
          'type="button"' + 'value="Submit Comment"' + '/></div>';
        feed.html(newIn);
      }
    });
  // just in case user times out
  } else {
    let url = '/index.html';
    window.location = url;
  }
}

/*
Performs an AJAX request to create a CommentSchema object in the database after a comment
has been written and added to the post. Additionally, the comments on posts will be
displayed under them once they are added as well.

@param id represents the post that is being commented on
*/
function commRequest(id) {
  var object = decodeURIComponent(document.cookie);
  if (object != '') {
    object = JSON.parse(object.replace('login=j:', ''));
    let ids = id.split(" ");
    let bio = $('#bio').val();
    let time = new Date().getTime();

    // create item object to send in AJAX request
    let comment = {time: time, user: {}, content: bio, post: {}};
    let commentAdd = JSON.stringify(comment);

    //send AJAX request to server
    $.ajax({
      url: '/add/comment/' + object.email + '/' + ids[2],
      data: {comment: commentAdd},
      method: 'POST',
    });
    viewPosts();
    viewPosts();
  } else {
    let url = '/home.html';
    window.location = url;
  }
}

/*
Redirects user to help.html when they click the HELP button in the top right corner
of the page.
*/
function help() {
  let url = '/help.html';
  window.location = url;
}

// pings server for friends, friend requests, groups, and the greeting to user
var friendInt = setInterval(viewFriends, 600);
var reqInt = setInterval(viewRequests, 600);
var groupInt = setInterval(viewGroupsIn, 600);
var greetInt = setInterval(greetUser, 600);
