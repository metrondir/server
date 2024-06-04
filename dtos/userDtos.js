module.exports = class UserDto {
  username;
  email;
  id;
  isAccivated;

  constructor(model) {
    this.username = model.username;
    this.email = model.email;
    this.id = model._id;
    this.isAccivated = model.isAccivated;
  }
};
