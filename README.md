
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

