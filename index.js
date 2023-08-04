const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const SHA256 = require("crypto-js/sha256");
const base64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const User = mongoose.model("User", {
  email: String,
  token: String,
  hash: String,
  salt: String,
  favorites: [
    {
    favoriteType: String, // 'character' ou 'comic'
    favoriteId: String,
    },
  ],
});

app.get("/", (req, res) => {
  res.send("Bienvenue sur l'API Marvel.");
});

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'email et le mot de passe sont renseignés
    if (!email || !password) {
      return res
        .status(400)
        .json({
          message: "Veuillez fournir un email et un mot de passe valides.",
        });
    }

    // Vérifier si l'email existe déjà dans la base de données
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({
          message: "Cet email est déjà utilisé par un autre utilisateur.",
        });
    }

    const salt = uid2(10);
    const hash = SHA256(password + salt).toString(base64);
    const token = uid2(10);

    const newUser = new User({
      email,
      token,
      hash,
      salt,
      favorites: [],
    });

    await newUser.save();

    res.status(200).json({
      _id: newUser._id,
      token: newUser.token,
      email: newUser.email,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const hashToCompare = SHA256(password + user.salt).toString(base64);
      if (hashToCompare === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          email: user.email,
        });
      } else {
        res.status(401).json({ message: "Non autorisé" });
      }
    } else {
      res.status(401).json({ message: "Non autorisé" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const MARVEL_API_BASE_URL = "https://lereacteur-marvel-api.herokuapp.com";
// comics page
app.get("/comics", async (req, res) => {
  try {
    const skip = Number(req.query.skip) || 0;
    const response = await axios.get(`${MARVEL_API_BASE_URL}/comics`, {
      params: {
        apiKey: process.env.MARVEL_API_KEY,
        limit: req.query.limit,
        skip: req.query.skip,
        title: req.query.title,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send("Erreur lors de la récupération des comics.");
  }
});
// charactere comics page
app.get("/comics/:characterId", async (req, res) => {
  try {
    const response = await axios.get(
      `${MARVEL_API_BASE_URL}/comics/${req.params.characterId}`,
      {
        params: {
          apiKey: process.env.MARVEL_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(500)
      .send("Erreur lors de la récupération des comics pour ce personnage.");
  }
});
// comics detail page
app.get("/comic/:comicId", async (req, res) => {
  try {
    const response = await axios.get(
      `${MARVEL_API_BASE_URL}/comic/${req.params.comicId}`,
      {
        params: {
          apiKey: process.env.MARVEL_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).send("Erreur lors de la récupération du comic spécifié.");
  }
});
// charactere page
app.get("/characters", async (req, res) => {
  try {
    const skip = Number(req.query.skip) || 0;
    const response = await axios.get(`${MARVEL_API_BASE_URL}/characters`, {
      params: {
        apiKey: process.env.MARVEL_API_KEY,
        limit: req.query.limit,
        skip: skip,
        name: req.query.name,
      },
    });
    // console.log(response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Marvel:", error);
    res.status(500).send("Erreur lors de la récupération des personnages.");
  }
});
// charactere detail page
app.get("/character/:characterId", async (req, res) => {
  console.log(req.params.characterId);
  try {
    const response = await axios.get(
      `${MARVEL_API_BASE_URL}/character/${req.params.characterId}`,
      {
        params: {
          apiKey: process.env.MARVEL_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du personnage spécifié:",
      error.message
    );
    res
      .status(500)
      .send("Erreur lors de la récupération du personnage spécifié.");
  }
});
// page favorites
app.post("/favorites", async (req, res) => {
  try {
    const { token, favoriteType, favoriteId } = req.body;
    // console.log(req.body);
    const user = await User.findOne({ token });
    // console.log("Utilisateur trouvé:", user);
    if (user) {
      // Trouvez l'index de l'élément favori
      const index = user.favorites.findIndex(
        (fav) => fav.favoriteType === favoriteType && fav.favoriteId === favoriteId
      );
    //   console.log("Index trouvé:", index);

      if (index > -1) {
        // Si le favori est déjà présent, le retirer
        user.favorites.splice(index, 1);
        console.log("Favori retiré");
      } else {
        // Sinon, l'ajouter
        user.favorites.push({ favoriteType: favoriteType, favoriteId: favoriteId });
        console.log("Favori ajouté");
      }

      await user.save();
      res.status(200).json(user.favorites);
    } else {
      res.status(404).send("Utilisateur non trouvé.");
    }
  } catch (error) {
    console.error(error)
    res.status(500).send(error.message);
  }
});




app.post("/favorites/add", async (req, res) => {
    try {
      const { token, favoriteType, favoriteId } = req.body;
      const user = await User.findOne({ token });
      if (user) {
        // Vérifiez si le favori est déjà présent
        const index = user.favorites.findIndex(
          (fav) => fav.favoriteType === favoriteType && fav.favoriteId === favoriteId
        );
        if (index === -1) {
          // Si non, ajoutez-le
          user.favorites.push({ favoriteType: favoriteType, favoriteId: favoriteId });
          await user.save();
          console.log("Favori ajouté");
          res.status(200).json(user.favorites);
        } else {
          res.status(409).send("Le favori est déjà présent.");
        }
      } else {
        res.status(404).send("Utilisateur non trouvé.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });




app.delete("/favorites/remove", async (req, res) => {
    try {
      const { token, favoriteType, favoriteId } = req.body;
      const user = await User.findOne({ token });
      if (user) {
        const index = user.favorites.findIndex(
          (fav) => fav.favoriteType === favoriteType && fav.favoriteId === favoriteId
        );
        if (index > -1) {
          user.favorites.splice(index, 1);
          await user.save();
          console.log("Favori retiré");
          res.status(200).json(user.favorites);
        } else {
          res.status(404).send("Favori non trouvé.");
        }
      } else {
        res.status(404).send("Utilisateur non trouvé.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });
    


app.get("/favorites", async (req, res) => {
    try {
      const token = req.query.token;
      const user = await User.findOne({ token });
      if (user) {
        res.status(200).json(user.favorites);
      } else {
        res.status(404).send("Utilisateur non trouvé.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });

  

app.all("*", (req, res) => {
  res.status(404).send("Désolé, cette route n'est pas disponible.");
});



app.listen(3000, () => {
  console.log("Serveur en écoute sur le port 3000");
});
