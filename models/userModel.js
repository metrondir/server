const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please add the user name"],
    },
    email: {
      type: String,
      required: [true, "Please add the user email adress"],
      unique: [true, "Email address already taken"],
    },
    password: {
      type: String,
      required: [true, "Please add the user password"],
    },
    isActivated: {
      type: Boolean,
      default: false,
    },
    picture: {
      type: String,
      required: false,
      default: "https://i.imgur.com/4jtCVcy.png",
    },
    activationLink: {
      type: String,
      required: false,
    },
    isChangePasswordLink: {
      type: Boolean,
      default: false,
    },
    activationLinkExpiration: {
      type: String,
      require: true,
    },

    changePasswordLinkExpiration: {
      type: String,
    },
    changePasswordLink: {
      type: String,
      required: [false, "Please add the user change password link"],
    },
    boughtRecipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe",
      },
    ],
    stripeAccountId: {
      type: String,
      required: false,
    },
    likedComments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    reactedComments: [
      {
        commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
        reaction: { type: String, required: true },
      },
    ],
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
