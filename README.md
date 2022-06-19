# FriendConnect

Author: Samantha Cox [samtastic8@email.arizona.edu](mailto:samtastic8@email.arizona.edu)

Date: July 22, 2020

## Notes

#### Description

This program is a social media application called FriendConnect where you can add friends, groups, posts, and customize your profile! More in depth information is described on help.html. Furthermore, a demonstration is provided in the link on the video.txt file. This was originally launched/run on a personal server, but I have modified the code to run locally (as the original host is no longer valid).

The home page is updated dynamically when the user makes requests to different pages via buttons. Utilizes cookies to keep track of the user's session (cookie-parser module). Password is encrypted using the crypto module (so that it is securely stored).

Server utilizes Node.js (specifically express and mongoose modules). DBMS used was MongoDB. The multer module was used to help store user images.

#### Bugs

None that I am currently aware of. Note: the uploads/images folder should be in the project but I don't think it shows up because it's empty.

## Included files

* README.md -- this file (contains program description and additional references)
* index.html -- the login page of the application 
* home.html -- the home page of the application
* help.html -- the help page of the application
* code.js -- the code that provides the functionality of index.html
* code-help.js -- the code that provides the functionality of help.html
* code-home.js -- the code that provides the functionality of home.html
* style.css -- the style for the login page
* style-home.css -- the style for the home page
* style-help.css -- the style for the help page
* server.js -- the server code of the application
* video.txt -- link to YouTube video that demonstrates how to use the application

## References
* What was taught in the web development course (CSC 337) I took at UArizona!
* https://www.npmjs.com/package/multer -- to help with the multer module
