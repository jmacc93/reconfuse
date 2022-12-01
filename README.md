
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
* Automatic recurrent processes in `/bots/` and the `/bots/ofr.s.js` file cleanup script
* Front end content universal to all instances of *reconfuse*:
  + In `/pagelets/`
  + Scripts in `/lib/`

Project reconfuse is intended to provide a platform for free expression of ideas

# Project status:

Reconfuse is in-development and pretty much very unstable. Expect bugs and an irritating UI

HOWEVER, it *is* currently usable and functional as a hybrid file browser / web forum / web blog / whatever

The current main developer Joe / jmacc93 works on it every day despite not commiting to this repo every day, so don't consider gaps between commits as meaning slow development (well, development may be slow, but only because Joe's progress per effort has decreased)

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
