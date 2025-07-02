const db = require("../models");
const Article = db.Article;

// CREATE
exports.createArticle = async (req, res) => {
  try {
    const { title, image, category, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description are required." });
    }

    const article = await Article.create({
      title,
      image,
      category,
      description,
      create_date: new Date(),
      update_date: new Date(),
      status_flag: 1,
    });

    res.status(201).json({ success: true, message: "Article created", data: article });
  } catch (err) {
    console.error("Create article error:", err.message);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// READ ALL
exports.getAllArticles = async (req, res) => {
  try {
    const articles = await Article.findAll({
      where: { status_flag: 1 },
      attributes: ['id', 'title', 'image', 'category'],
    });

    res.status(200).json({ success: true, data: articles });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch articles", error: err.message });
  }
};

// READ ONE
exports.getArticleById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const article = await Article.findOne({
      where: { id, status_flag: 1 },
    });

    if (!article) return res.status(404).json({ success: false, message: "Article not found" });

    res.status(200).json({ success: true, data: article });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching article", error: err.message });
  }
};

// UPDATE
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, category, description } = req.body;

    const article = await Article.findByPk(id);
    if (!article || article.status_flag !== 1) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    await article.update({ title, image, category, description, update_date: new Date() });

    res.status(200).json({ success: true, message: "Article updated", data: article });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating article", error: err.message });
  }
};

// DELETE (soft)
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findByPk(id);

    if (!article || article.status_flag !== 1) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    article.status_flag = 0;
    await article.save();

    res.status(200).json({ success: true, message: "Article deleted (soft)" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting article", error: err.message });
  }
};
