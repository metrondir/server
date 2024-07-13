const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const isLoggedMiddlware = require("../middleware/isLoggedMiddlware");
const router = express.Router();
const {
  getCommentsByRecipeId,
  createCommentByRecipeId,
  likeCommentById,
  reactToComment,
  deleteCommentById,
  updateCommentById,
  getCommentsByUserId,
  getCommentsByParentCommentId,
  getCommentsByCommentId,
  getCommentsByTags,
} = require("../controllers/commentController");

router.get("/:id", isLoggedMiddlware, getCommentsByRecipeId);
router.post("/:id", authMiddleware, createCommentByRecipeId);
router.post("/:id/like", authMiddleware, likeCommentById);
router.post("/:id/react", authMiddleware, reactToComment);
router.delete("/:id", authMiddleware, deleteCommentById);
router.put("/:id", authMiddleware, updateCommentById);
router.get("/user/:id", isLoggedMiddlware, getCommentsByUserId);
router.get("/parent/:id", isLoggedMiddlware, getCommentsByParentCommentId);
router.get("/comment/:id", isLoggedMiddlware, getCommentsByCommentId);
router.get("/tags/:id", isLoggedMiddlware, getCommentsByTags);
module.exports = router;
//create comment by recipeId
//like comment by id
//delete comment or replys of comment by id can  only by user who created comment or reply
//update comment or replys of comment by id can  only by user who created comment or reply
//react to comment
//get comments by recipeId with likes if user have like in comments or in replys
//get comments by userId
//get comments by parentCommentId //its replys
//get comments by commentId
//get comments by tags
