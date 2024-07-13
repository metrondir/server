const asyncHandler = require("express-async-handler");
const commentService = require("../services/commentService");

/**
 * @desc Get comments by recipeId
 * @route GET /api/comments/recipe/:recipeId
 * @access public
 * @param {string} req.params.id - The recipeId
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @param {string} req.query.limit - The limit of comments
 * @param {string} req.query.page - The page of comments
 * @param {string} req.query.language - The language of comments
 * @returns {Array} The array of comments
 */
const getCommentsByRecipeId = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const { limit, page, language } = req.query;
    const comments = commentService.getCommentsByRecipeId(
      recipeId,
      userId,
      isLogged,
      language,
    );
    const paginatedComments = paginateArray(comments, page, limit);
    res.status(200).json(paginatedComments);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Create comment by recipeId
 * @route POST /api/comments/recipe/:recipeId
 * @access private
 * @param {string} req.params.id - The recipeId
 * @param {string} req.body.comment - The comment
 * @param {string} req.body.tags - The tags
 * @param {string} req.body.parentCommentId - The parentCommentId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @param {string} req.user.id - The userId
 * @returns {Object} The comment
 */
const createCommentByRecipeId = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    const isLogged = req.user.isLogged;
    const { comment, parentCommentId, tags } = req.body;
    const newComment = commentService.createCommentByRecipeId(
      recipeId,
      comment,
      parentCommentId,
      tags,
      userId,
      isLogged,
    );
    req.io.emit("newComment", newComment);
    res.status(201).json(newComment);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Like comment by id
 * @route POST /api/comments/:id/like
 * @access private
 * @param {string} req.params.id - The commentId
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @returns {Object} The comment
 */
const likeCommentById = asyncHandler(async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const likedComment = commentService.likeCommentById(
      commentId,
      userId,
      isLogged,
    );
    req.io.emit("likedComment", { commentId, userId });
    res.status(200).json(likedComment);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc React to comment
 * @route POST /api/comments/:id/react
 * @access private
 * @param {string} req.params.id - The commentId
 * @param {string} req.body.reaction - The reaction
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @returns {Object} The comment
 */
const reactToComment = asyncHandler(async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const { reaction } = req.body;
    const reactedComment = commentService.reactToComment(
      commentId,
      userId,
      isLogged,
      reaction,
    );
    req.io.emit("reactedComment", { commentId, reaction });
    res.status(200).json(reactedComment);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Delete comment by id
 * @route DELETE /api/comments/:id
 * @access private
 * @param {string} req.params.id - The commentId
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @returns {string} The message
 */
const deleteCommentById = asyncHandler(async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const deletedComment = commentService.deleteCommentById(
      commentId,
      userId,
      isLogged,
    );
    req.io.emit("deletedComment", { commentId, userId });
    res.status(200).json("Comment deleted successfully");
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Update comment by id
 * @route PUT /api/comments/:id
 * @access private
 * @param {string} req.params.id - The commentId
 * @param {string} req.body.comment - The comment
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @returns {Object} The comment
 */
const updateCommentById = asyncHandler(async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const { comment } = req.body;
    const updatedComment = commentService.updateCommentById(
      commentId,
      userId,
      isLogged,
      comment,
    );
    req.io.emit("updatedComment", { commentId, userId });
    res.status(200).json(updatedComment);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Get comments by userId
 * @route GET /api/comments/user/:userId
 * @access public
 * @param {string} req.params.id - The userId
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @param {string} req.query.limit - The limit of comments
 * @param {string} req.query.page - The page of comments
 * @param {string} req.query.language - The language of comments
 * @returns {Array} The array of comments
 */
const getCommentsByUserId = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user.id;
    const isLogged = req.user.isLogged;
    const { limit, page, language } = req.query;
    const comments = commentService.getCommentsByUserId(
      userId,
      currentUserId,
      isLogged,
      language,
    );
    const paginatedComments = paginateArray(comments, page, limit);
    res.status(200).json(paginatedComments);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Get comments by parentCommentId
 * @route GET /api/comments/parent/:parentCommentId
 * @access public
 * @param {string} req.params.id - The parentCommentId
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @param {string} req.query.limit - The limit of comments
 * @param {string} req.query.page - The page of comments
 * @param {string} req.query.language - The language of comments
 * @returns {Array} The array of comments
 */
const getCommentsByParentCommentId = asyncHandler(async (req, res, next) => {
  try {
    const parentCommentId = req.params.id;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const { limit, page, language } = req.query;
    const comments = commentService.getCommentsByParentCommentId(
      parentCommentId,
      userId,
      isLogged,
      language,
    );
    const paginatedComments = paginateArray(comments, page, limit);
    res.status(200).json(paginatedComments);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Get comments by commentId
 * @route GET /api/comments/comment/:commentId
 * @access public
 * @param {string} req.params.id - The commentId
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @param {string} req.query.limit - The limit of comments
 * @param {string} req.query.page - The page of comments
 * @param {string} req.query.language - The language of comments
 * @returns {Array} The array of comments
 */
const getCommentsByCommentId = asyncHandler(async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const { limit, page, language } = req.query;
    const comments = commentService.getCommentsByCommentId(
      commentId,
      userId,
      isLogged,
      language,
    );
    const paginatedComments = paginateArray(comments, page, limit);
    res.status(200).json(paginatedComments);
  } catch (error) {
    return next(error);
  }
});

/**
 * @desc Get comments by tags
 * @route GET /api/comments/tags
 * @access public
 * @param {string} req.query.tags - The tags
 * @param {string} req.user.id - The userId
 * @param {boolean} req.user.isLogged - The user is logged in
 * @param {string} req.query.limit - The limit of comments
 * @param {string} req.query.page - The page of comments
 * @param {string} req.query.language - The language of comments
 * @returns {Array} The array of comments
 */
const getCommentsByTags = asyncHandler(async (req, res, next) => {
  try {
    const { tags } = req.query;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const { limit, page, language } = req.query;
    const comments = commentService.getCommentsByTags(
      tags,
      userId,
      isLogged,
      language,
    );
    const paginatedComments = paginateArray(comments, page, limit);
    res.status(200).json(paginatedComments);
  } catch (error) {
    return next(error);
  }
});

module.exports = {
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
};
