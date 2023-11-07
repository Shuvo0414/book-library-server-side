const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5001;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp3liji.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify user
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKE_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const booksCollection = client
      .db("bookLibraryDb")
      .collection("booksCollection");

    const newBooksCollection = client
      .db("bookLibraryDb")
      .collection("newBooksCollection");

    // auth related api

    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKE_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // logout user clear cookie

    app.post("/api/v1/logout", async (req, res) => {
      const user = req.body;
      // console.log("logout user");
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //  get bookcollection by book-categories
    app.get("/api/v1/book-categories", async (req, res) => {
      const cursor = booksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get all book from newbookcollection

    app.get("/api/v1/books", verifyToken, async (req, res) => {
      const cursor = newBooksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get book by using categoryName
    app.get("/api/v1/books/:categoryName", async (req, res) => {
      const categoryName = req.params.categoryName;
      console.log("Received request for brand:", categoryName);
      const cursor = newBooksCollection.find({ categoryName });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/api/v1/books", verifyToken, async (req, res) => {
      const newBooks = req.body;
      console.log(newBooks);
      const result = await newBooksCollection.insertOne(newBooks);
      res.send(result);
    });

    // upadte a book
    app.put("/api/v1/books/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const upadteBooks = req.body;
      const books = {
        $set: {
          image: upadteBooks.image,
          name: upadteBooks.name,
          author: upadteBooks.author,
          categoryName: upadteBooks.categoryName,
          rating: upadteBooks.rating,
        },
      };
      const result = await newBooksCollection.updateOne(filter, books, options);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Assignment 11 server side is running");
});

app.listen(port, () => {
  console.log(`Assignment server side is running on portr ${port}`);
});
