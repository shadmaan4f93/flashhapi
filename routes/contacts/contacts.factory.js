module.exports = ({
  fs,
  path,
  formidable,
  mkdirp,
  utils,
  extend,
  moment,
  Contact
}) => {
  function getContacts(req, res) {
    var query = req.query;

    var optobj = {};
    if (typeof query.rid !== "undefined") {
      optobj.restaurant = query.rid;
    }

    // Use the contact model to find coeempany's contacts
    return Contact.find(optobj, function(err, data) {
      if (err) {
        res.send(err);
      } else {
        var list = data.map(function(item) {
          var obj = extend({}, item)._doc;
          obj.name = obj.firstName + " " + obj.lastName;
          return obj;
        });
        res.json(list);
      }
    }).select("-_id -__v");
  }

async function getContactsById(req, res) {
    var id = req.params.id;
    // Use the Contact model to find contact by Id
  return  Contact.find({id: id }, function(err, data) {
      if (err) {
        res.send(err);
      } else {
        res.json(data);
      }
    }).select("-_id -__v");
  }

async function postContacts(req, res) {
    var opt = extend({}, req.body);
    //increate id value 1, and insert it
    utils.getNextSequenceValue("contactId").exec(function(err, data) {
      console.log("getNextSequenceValue", data);

      opt.id = data.sequenceValue;

      var contact = new Contact(opt);
      console.log(opt);

     return contact.save(function(err, doc) {
        if (err) {
          res.status(400).send(err);
        } else if(doc){
          var doc = extend({}, doc._doc);
          doc.name = res.json({
            message: "Successfully added a new contact!",
            data: opt
          });
        } else {
          res.json({
            message: "Add contact failed!",
            data: []
          });
        }
      });
    });
  }

  function putContacts(req, res) {
    //
    var opt = extend({}, req.body);

    opt.modifiedAt = new Date();
    Contact.findOneAndUpdate(
      { id: req.params.id },
      opt,
      { new: true },
      function(err, doc) {
        if (err) {
          res.send(err);
        } else if(!doc){
          res.send({ message: "Can't find contact", data: []});
        } else {
          var newDoc = extend({}, doc._doc);
          newDoc.name = newDoc.firstName + " " + newDoc.lastName;
          res.json({ message: "Successfully updated!", data: newDoc });
        }
      }
    );
  }

  function delContacts(req, res) {
    //array of restaurant id.
    if (typeof req.params.id === "object") {
      //certain id
    } else {
      Contact.remove({ id: req.params.id }, function(err,doc) {
        if (err) {
          res.send(err);
        } else if(doc.result.n > 0){
          //remove related files
          var profilepath = path.join(
            __dirname,
            "../public/upload/contacts/" + req.params.id + "/images/profile"
          );
          utils.deleteFolderRecursive(profilepath);

          res.json({ message: "Successfully removed the contact!" });
        } else {
          res.send({ message: "Remove contact failed!"});
        }
      });
    }
  }

  function postContactsByIdPhoto(req, res) {
    var req = req;
    // Use the Restaurant model to find all restaurants
    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory
    form.uploadDir = path.join(
      __dirname,
      "../public/upload/contacts/" + req.params.id + "/images/profile"
    );

    //check file path, create if none
    if (!fs.existsSync(form.uploadDir)) {
      console.log("create folder", form.uploadDir);
      mkdirp(form.uploadDir, function(err) {
        if (err) res.send(err);

        console.log("pow!");
        upload();
      });
    } else {
      upload();
    }

    function upload() {
      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      var newName, resFile;
      form.on("file", function(field, file) {
        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        var fn = file.name,
          ext = fn.substr(fn.lastIndexOf("."));
        newName = "photo_" + moment().valueOf() + ext;
        resFile = path.join(form.uploadDir, newName);
        fs.rename(file.path, resFile);
      });

      // log any errors that occur
      form.on("error", function(err) {
        console.log("An error has occured: \n" + err);
      });

      // once all the files have been uploaded, send a response to the client
      form.on("end", function() {
        //update admin's photo
        var photoPath = resFile.substr(resFile.indexOf("/upload/contacts"));

        console.log("end", photoPath, new Date());
        Contact.findOneAndUpdate(
          { id: req.params.id },
          { photo: photoPath, modifiedAt: new Date() },
          function(err, num, raw) {
            if (err) res.send(err);

            res.json({ filename: newName });
          }
        );
      });

      // parse the incoming request containing the form data
      form.parse(req);
    }
  }

  return {
    getContacts,
    getContactsById,
    postContacts,
    putContacts,
    delContacts,
    postContactsByIdPhoto,
  }
};