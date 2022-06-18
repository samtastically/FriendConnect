/*
Author: Samantha Cox
File: code-help.js
Description: This provides the functionality for help.html. Provides functionality
by enabling return back button to take you back to home.html or index.html (depends
on whether or not you are logged into a session).
*/

/*
Redirects user to index.html or home.html when they click the Return Back button
at the bottom of the page (page returned depends if logged in session).
*/
function returnHome() {
  let url = '/index.html';
  window.location = url;
}
