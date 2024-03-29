
# Reconfuse ![](./favicon.ico)

This contains the major components for project reconfuse
* Fragment server -- a server which:
  + Calls arbitrary initialization scripts
  + Defers arbitrary urls to scripts
  + Serves files in:
    - Raw form
    - With substitutions
    - Via `.jfp` / `.jhp` scripts
* Server scripts in `/bin/` for:
  + Manipulating files (eg: `/bin/file.s.js`)
  + Checking user permissions (in `/bin/group.s.js` and using `control.json` files)
  + Registering and validating users (in `/bin/user.s.js`)
* Automatic recurrent processes in `/bots/` and the `/bots/ofr.s.js` automatic file deletion script
* Front end content universal to all instances of *reconfuse*:
  + In `/pagelets/`
  + Scripts in `/lib/`

Project reconfuse is intended to provide a platform for free expression of ideas. However, it is specifically usable as a wiki, forum, static pagelet host, etc

# Project status:

Reconfuse is no longer in development and is only fairly stable. Expect bugs and an irritating UI

HOWEVER, it *is* currently usable and functional as a hybrid file browser / web forum / web blog / whatever

# How to run:

Note: this was developed on linux and likely only works on linux. If you try to run it on Windows (or whatever else) and it doesn't work, contact me (Joe / jmacc93) and I might be able to help

Make sure you have the required dependencies, which are: `node` (that's it, you just need node)
If you use `apt`, you can download and install `node` via the terminal command: `sudo apt install nodejs`
Alternatively, go to [Node's website](https://nodejs.org/en/download/) and download the binaries there

Download the code by either:
* Clicking the green `Code` button on the main repository github page and then the `Download ZIP`, OR
* Opening a terminal and typing `git clone https://github.com/jmacc93/reconfuse`, this will create a new directory with the repo's contents

Now, open a terminal or `cd` into the new directory and in the terminal run: `node fragment-server.js`. You should see 'Fragment server started on port 5502' or similar (note: you can change the port in `server-config.json`)

Now just navigate to `localhost:5502/` in a webbrowser on the same computer and you should see *reconfuse*'s `/index.jhp` page

You'll likely also want to create a new admin user by:
  1. Creating a user through the UI
  2. Adding that user's username into `/groups/admin/members.txt` (create the file if necessary)
