const mongoose = require("mongoose");
const { Schema } = mongoose;
const { isSpoonacularRecipe } = require("../utils/repetetiveCondition");
const reactionSchema = new Schema({
  emoji: { type: String, required: true },
  count: { type: Number, default: 0 },
});
const commentSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    recipeId: { type: String, required: true },
    comment: {
      type: String,
      required: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    likes: {
      type: Number,
      default: 0,
    },
    tags: [String],
    reactions: [reactionSchema],
    status: {
      type: String,
      enum: ["active", "flagged", "deleted"],
      default: "active",
    },

    source: { type: String, enum: ["user", "spoonacular"] },
    reactions: [reactionSchema],
  },
  {
    timestamps: true,
  },
);
commentSchema.pre("save", function (next) {
  this.source = isSpoonacularRecipe(this.recipeId) ? "spoonacular" : "user";
  next();
});
const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
