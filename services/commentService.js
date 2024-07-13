const Recipe = require("../models/recipeModel");
const Comment = require("../models/commentModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../middleware/apiError");

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

/**
 * @desc Create comment by recipeId
 * @param {string} recipeId - The recipeId
 * @param {string} comment - The comment
 * @param {string} parentCommentId - The parentCommentId
 * @param {Array} tags - The tags
 * @param {boolean} isLogged - The user is logged in
 * @param {string} userId - The userId
 * @returns {Object} The comment
 */
const createCommentByRecipiId = asyncHandler(
  async (recipeId, comment, parentId, tags, userId, isLogged) => {
    const recipe = await Recipe.findById(recipeId);
    if (!isLogged) throw ApiError.Unauthorized("User is not logged in");
    if (!recipe) throw ApiError.NotFound("Recipe not found");

    const newComment = new Comment({
      comment,
      recipeId,
      userId,
      tags,
      parentId,
    });
    await newComment.save();
    return newComment;
  },
);
/**
 * @desc Like comment by id
 * @param {string} commentId - The commentId
 * @param {boolean} isLogged - The user is logged in
 * @param {string} userId - The userId
 * @returns {Object} The comment
 */
const likeCommentById = asyncHandler(async (commentId, userId, isLogged) => {
  if (!isLogged) throw ApiError.Unauthorized("User is not logged in");
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.NotFound("Comment not found");
  if (comment.likes.includes(userId))
    comment.likes = comment.likes.filter((like) => like !== userId);
  else comment.likes.push(userId);
  await comment.save();
  return comment;
});

/**
 * @desc Delete comment by id
 * @param {string} commentId - The commentId
 * @param {boolean} isLogged - The user is logged in
 * @param {string} userId - The userId
 * @returns {Object} The comment
 */
const deleteCommentById = asyncHandler(async (commentId, userId, isLogged) => {
  if (!isLogged) throw ApiError.Unauthorized("User is not logged in");
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.NotFound("Comment not found");
  if (comment.userId !== userId)
    throw ApiError.Unauthorized("User is not authorized");
  await comment.remove();
  return comment;
});

/**
 * @desc Update comment by id
 * @param {string} commentId - The commentId
 * @param {string} comment - The comment
 * @param {string} tags - The tags
 * @param {boolean} isLogged - The user is logged in
 * @param {string} userId - The userId
 * @returns {Object} The comment
 */
const updateCommentById = asyncHandler(
  async (commentId, commentText, tags, userId, isLogged) => {
    if (!isLogged) throw ApiError.Unauthorized("User is not logged in");
    const comment = await Comment.findById(commentId);
    if (!comment) throw ApiError.NotFound("Comment not found");
    if (comment.userId !== userId)
      throw ApiError.Unauthorized("User is not authorized");
    comment.comment = commentText;
    comment.tags = tags;
    await comment.save();
    return comment;
  },
);
/**
 * @desc React to comment
 * @param {string} commentId - The commentId
 * @param {string} reaction - The reaction
 * @param {boolean} isLogged - The user is logged in
 * @param {string} userId - The userId
 * @returns {Object} The comment
 */
const reactToComment = asyncHandler(
  async (commentId, reaction, userId, isLogged) => {
    if (!isLogged) throw ApiError.Unauthorized("User is not logged in");
    const comment = await Comment.findById(commentId);
    if (!comment) throw ApiError.NotFound("Comment not found");
    if (comment.reactions.includes(userId))
      comment.reactions = comment.reactions.filter((react) => react !== userId);
    else comment.reactions.push(userId);
    await comment.save();
    return comment;
  },
);
/**
 * @desc Get comments by recipeId
 * @param {string} recipeId - The recipeId
 * @param {string} language - The language
 * @param {string} userId - The userId
 * @param {boolean} isLogged - The user is logged in
 * @returns {Object} The comments
 */
const getCommentsByRecipeId = asyncHandler(
  async (recipeId, language, userId, isLogged) => {
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) throw ApiError.NotFound("Recipe not found");
    const comments = await Comment.find({ recipeId });
    if (!comments) return [];
    if (isLogged) {
      comments.some((comment) => {
        if (comment.likes.includes(userId)) comment.liked = true;
        if (comment.reactions.includes(userId)) comment.reacted = true;
        return comment.replies.some((reply) => {
          if (reply.likes.includes(userId)) reply.liked = true;
          if (reply.reactions.includes(userId)) reply.reacted = true;
          return false;
        });
      });
    }
    return comments;
  },
);

/**
 * @desc Get comments by userId
 * @param {string} userId - The userId
 * @param {string} language - The language
 * @param {boolean} isLogged - The user is logged in
 * @returns {Object} The comments
 */

const getCommentsByUserId = asyncHandler(
  async (userId, isLogged, language) => {},
);

/**
 * @desc Get comments by parentCommentId
 * @param {string} parentCommentId - The parentCommentId
 * @param {string} language - The language
 * @param {string} userId - The userId
 * @param {boolean} isLogged - The user is logged in
 * @returns {Object} The comments
 */
const getCommentsByParentCommentId = asyncHandler(
  async (parentCommentId, language, userId, isLogged) => {
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) throw ApiError.NotFound("Parent Comment not found");
    const comments = await Comment.find({ parentId: parentCommentId });
    if (!comments) throw ApiError.NotFound("Comments not found");
    if (isLogged) {
      comments.some((comment) => {
        if (comment.likes.includes(userId)) comment.liked = true;
        if (comment.reactions.includes(userId)) comment.reacted = true;
        return comment.replies.some((reply) => {
          if (reply.likes.includes(userId)) reply.liked = true;
          if (reply.reactions.includes(userId)) reply.reacted = true;
          return false;
        });
      });
    }
    return comments;
  },
);

/**
 * @desc Get comments by commentId
 * @param {string} commentId - The commentId
 * @param {string} language - The language
 * @param {string} userId - The userId
 * @param {boolean} isLogged - The user is logged in
 * @returns {Object} The comments
 */
const getCommentsByCommentId = asyncHandler(
  async (commentId, language, userId, isLogged) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw ApiError.NotFound("Comment not found");
    const comments = await Comment.find({ parentId: commentId });
    if (!comments) throw ApiError.NotFound("Comments not found");
    if (isLogged) {
      comments.some((comment) => {
        if (comment.likes.includes(userId)) comment.liked = true;
        if (comment.reactions.includes(userId)) comment.reacted = true;
        return comment.replies.some((reply) => {
          if (reply.likes.includes(userId)) reply.liked = true;
          if (reply.reactions.includes(userId)) reply.reacted = true;
          return false;
        });
      });
    }
    return comments;
  },
);

/**
 * @desc Get comments by tags
 * @param {Array} tags - The tags
 * @param {string} language - The language
 * @param {string} userId - The userId
 * @param {boolean} isLogged - The user is logged in
 * @returns {Object} The comments
 */
const getCommentsByTags = asyncHandler(
  async (tags, language, userId, isLogged) => {
    const comments = await Comment.find({ tags: { $in: tags } });
    if (!comments) throw ApiError.NotFound("Comments not found");
    if (isLogged) {
      comments.some((comment) => {
        if (comment.likes.includes(userId)) comment.liked = true;
        if (comment.reactions.includes(userId)) comment.reacted = true;
        return comment.replies.some((reply) => {
          if (reply.likes.includes(userId)) reply.liked = true;
          if (reply.reactions.includes(userId)) reply.reacted = true;
          return false;
        });
      });
    }

    return comments;
  },
);
module.exports = {
  createCommentByRecipiId,
  likeCommentById,
  deleteCommentById,
  updateCommentById,
  reactToComment,
  getCommentsByRecipeId,
  getCommentsByUserId,
  getCommentsByParentCommentId,
  getCommentsByCommentId,
  getCommentsByTags,
};
