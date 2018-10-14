var fs = require("fs");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("../models");

module.exports = function (app) {
    app.get("/", function (req, res) {
        db.Article.find({}).sort({ _id: -1 })
            .then(function (dbArticle) {
                res.render("index", {
                    articles: dbArticle
                });
            });
    });

    // A GET route for scraping the Salon website
    app.get("/scrape", function (req, res) {
        // First, we grab the body of the html with axios
        axios.get("http://www.salon.com/").then(function (response) {

            fs.writeFile("output.html", response.data, function (err) { console.log(err) });

            // Then, we load that into cheerio and save it to $ for a shorthand selector
            var $ = cheerio.load(response.data);

            // Now, we grab every .card-article within .card-row, and do the following:
            $(".card-row .card-article ").each(function (i, element) {
                // Save an empty result object
                var result = {};
                var title = $(this).find("h2").text();
                var link = $(this).children("a").attr("href");
                var image = $(this).find("img").attr("src");
                var summary = "";
                var author = $(this).find("strong").text().trim();

                // Add the text and href of every link, and save them as properties of the result object
                if (title.length > 0 && link.length > 0 && image.length > 0) {
                    result.title = title;
                    result.link = link;
                    result.image = image;
                    result.author = author;

                    // Get summary of article
                    axios.get(result.link).then(function (response) {
                        var $ = cheerio.load(response.data);

                        $("meta[name='description']").each(function (i, element) {
                            summary = $(this).attr("content");
                            result.summary = summary;
                        })

                        if (title.length > 0 && link.length > 0 && image.length > 0 && summary.length > 0) {
                            // Create a new Article using the `result` object built from scraping
                            db.Article.insertMany(result)
                                .then(function (dbArticle) {
                                    // View the added result in the console
                                    console.log("\nthis is from dbarticle " + dbArticle);
                                })
                                .catch(function (err) {
                                    //console.log(err);
                                    // If an error occurred, send it to the client
                                    //return res.json(err);
                                });
                        }
                    });
                }
            });

        });
        setTimeout(function () { res.redirect("/") }, 5000);
    });

    // Route for getting all Articles from the db
    app.get("/articles", function (req, res) {
        // Grab every document in the Articles collection
        db.Article.find({})
            .then(function (dbArticle) {
                // If we were able to successfully find Articles, send them back to the client
                res.json("article", {
                    articles: dbArticle
                });
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route for grabbing a specific Article by id, populate it with it's comment
    app.get("/articles/:id", function (req, res) {
        // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
        db.Article.findOne({ _id: req.params.id })
            // ..and populate all of the comments associated with it
            .populate("comment")
            .then(function (dbArticle) {
                // If we were able to successfully find an Article with the given id, send it back to the client
                res.render("article", {
                    articles: dbArticle
                });
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route for saving/updating an Article's associated comment
    app.post("/articles/:id", function (req, res) {
        // Create a new comment and pass the req.body to the entry
        db.Comment.create(req.body, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                db.Article.findOneAndUpdate({
                    "_id": req.params.id
                }, {
                        $push: {
                            "comment": res._id
                        }
                    }, {
                        safe: true,
                        upsert: true,
                        new: true
                    }).exec(function (err, res) {
                        if (err) {
                            res.send(err);
                        }
                    });
            }
        });
        res.redirect("/articles/" + req.params.id);
    });

    // Delete Comment from the DB
    app.get("/articles/:id/:commentid", function (req, res) {
        // Remove a note using the objectID
        db.Comment.findByIdAndRemove(req.params.commentid, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                db.Article.findOneAndUpdate({
                    "_id": req.params.id
                }), {
                    $pull: {
                        "comment": res._id
                    }
                };
            }
        }).exec(function(err, res) {
            if (err) {
                console.log(err);
            }
        });
        res.redirect("/articles/:id")
    });
};