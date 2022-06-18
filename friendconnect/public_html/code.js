/*
Author: Samantha Cox
File: code.js
Description: This provides the functionality for index.html. When the user enters
an account to be created, creates an account. Ensures that two users do not have
the same email address associated with an account. Makes sure all fields are filled
out before creating an account. Additionally, allows the user to login, and when
they login, a new session is generated in the server. Ths makes this a smoother app
on the client side because the page doesn't have to refresh every time a request is made!
*/

/*
Performs an AJAX request to add a new user to the friendconnect database. Creates a user
object and uses JSON to stringify the object to be parsed by the server. Updates DOM
with the the outcome of their request (ie: account created vs email is
already taken).
*/
function addUser() {
  if (validateInput()) {
    // create user object to send in AJAX request
    let firstName = $('#firstName').val();
    let lastName = $('#lastName').val();
    let email = $('#email').val();
    let pass = $('#password').val();
    let user = {firstName : firstName, lastName: lastName, email: email, password: pass,
       visibility : 'PUBLIC', posts: [], comments: [], groups: [], friends: [],
       sentRequests: [], receivedRequests: []};
    let userAdd = JSON.stringify(user);

    // send AJAX request to server
    $.ajax({
      url: '/add/user/',
      data: {user: userAdd},
      method: 'POST',
      success: function (result) {
        let error = $('#createError');
        error.html(result);
      }
    });
  } else {
    let error = $('#createError');
    error.html('Please fill out all of the fields and provide a valid email address!');
  }
}

/*
Validates input for account creation. Are all fields filled out and is the email in
the format described on the help page?

@return whether or notaccount creation was valid
*/
function validateInput() {
  let firstName = $('#firstName').val();
  let lastName = $('#lastName').val();
  let pass = $('#password').val();
  let email = $('#email').val();
  // use regex to check with email address
  return (/\S+@\S+\.\S+/.test(email)) && (firstName != "")  && (lastName != "")
    && (pass != "");
}

/*
Performs an AJAX request to log in a user to the friendconnect application. If login was
successful, redirects user to home.html. If login fails, alerts the user by
updating the HTML with an error message.
*/
function loginUser() {
  let email = $('#logEmail').val();
  let pass = $('#logPassword').val();

  // send AJAX request to server
  $.ajax({
    url: '/login/' + email + '/' + pass,
    method: 'GET',
    success: function (result) {
      if (result == 'OK') {
        let url = '/home.html';
        window.location = url;
      } else {
        let error = $('#error');
        error.html('Issue logging in with that info');
      }
    }
  });
}

/*
Redirects user to help.html when they click the HELP button in the top right corner
of the page.
*/
function help() {
  let url = '/help.html';
  window.location = url;
}
