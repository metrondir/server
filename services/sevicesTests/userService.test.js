const User = require("../../models/userModel");
const EmailService = require("../gmailService");
const moment = require("moment");
const gmailService = new EmailService();
const Recipe = require("../../models/recipeModel");
const FavoriteRecipe = require("../../models/favoriteRecipeModel");
const {
  generateTokens,
  saveTokens,
  removeToken,
  validateRefreshToken,
  findToken,
} = require("../tokenService");
const UserDto = require("../../dtos/userDtos");
const ApiError = require("../../middleware/apiError");
const {
  storeRegistrationDetails,
  getRegistrationDetailsByActivationLink,
  deleteRegistrationDetailsByActivationLink,
  setBlackListToken,
} = require("../redisService");
const {
  registration,
  activate,
  login,
  logout,
  forgetPassword,
  changePassword,
  changePasswordLink,
  deleteUser,
  findUserByRefreshToken,
  refresh,
} = require("../userService");
jest.mock("../gmailService");
jest.mock("../../models/userModel");
jest.mock("../../models/recipeModel");
jest.mock("../../models/favoriteRecipeModel");
jest.mock("../redisService");

describe("userService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("registration", () => {
    test("registration should return the user data", async () => {
      const username = "dahou22";
      const email = "dahou22@gmail.com";
      const password = "123456";
      const activationLink = "https://www.example.com/activate/123456";

      const mockStoreRegistrationDetails = jest
        .spyOn(require("../redisService"), "storeRegistrationDetails")
        .mockImplementation(
          async (activationLink, username, email, password) => {
            return { activationLink, username, email, password };
          },
        );

      const mockSendActivationGmail = jest
        .spyOn(EmailService.prototype, "sendActivationGmail")
        .mockResolvedValue({
          email,
          activationLink,
        });

      await registration(username, email, password);

      expect(mockStoreRegistrationDetails).toHaveBeenCalled();
      expect(mockSendActivationGmail).toHaveBeenCalled();
    });
  });
  describe("activate function", () => {
    test("should activate user successfully", async () => {
      const activationLink = "valid_activation_link";
      const registrationDetails = {
        username: "testUser",
        email: "testuser@example.com",
        hashedPassword: "hashedPassword",
        activationLink: activationLink,
        isActivated: false,
        activationLinkExpiration: moment().add(1, "hour").toISOString(),
      };

      getRegistrationDetailsByActivationLink.mockResolvedValue(
        registrationDetails,
      );

      const mockUser = {
        username: registrationDetails.username,
        email: registrationDetails.email,
        hashedPassword: registrationDetails.hashedPassword,
        activationLink: registrationDetails.activationLink,
        activationLinkExpiration: undefined,
        isActivated: true,
        save: jest.fn().mockResolvedValue(),
      };

      User.create = jest.fn().mockResolvedValue(mockUser);

      deleteRegistrationDetailsByActivationLink.mockResolvedValue();
      jest.spyOn(require("../tokenService"), "generateTokens").mockReturnValue({
        accessToken: "accessToken",
        refreshToken: "refreshToken",
      });

      jest.spyOn(require("../tokenService"), "saveTokens").mockResolvedValue();

      const result = await activate(activationLink);

      expect(result.accessToken).toBe("accessToken");
      expect(result.refreshToken).toBe("refreshToken");
      expect(result.user.username).toBe("testUser");

      expect(User.findOne).toHaveBeenCalledWith({
        activationLink: registrationDetails.activationLink,
      });

      expect(mockUser.save).toHaveBeenCalled();

      expect(deleteRegistrationDetailsByActivationLink).toHaveBeenCalledWith(
        activationLink,
      );

      expect(saveTokens).toHaveBeenCalledWith(
        expect.any(String), // userId
        "refreshToken",
      );
    });
  });
  //    test("should handle expired activation link", async () => {
  //      const activationLink = "expired_activation_link";
  //      const registrationDetails = {
  //        username: "testUser",
  //        email: "testuser@example.com",
  //        hashedPassword: "hashedPassword",
  //        activationLink: activationLink,
  //        activationLinkExpiration: moment().subtract(1, "hour").toISOString(),
  //      };

  //      jest
  //        .spyOn(
  //          require("../redisService"),
  //          "getRegistrationDetailsByActivationLink",
  //        )
  //        .mockResolvedValue(registrationDetails);

  //      const storeRegistrationDetailsMock = jest
  //        .spyOn(require("../redisService"), "storeRegistrationDetails")
  //        .mockResolvedValue();

  //      const sendActivationEmailMock = jest
  //        .spyOn(require("../gmailService"), "sendActivationEmail")
  //        .mockResolvedValue();

  //      const deleteRegistrationDetailsByActivationLinkMock = jest
  //        .spyOn(
  //          require("../redisService"),
  //          "deleteRegistrationDetailsByActivationLink",
  //        )
  //        .mockResolvedValue();

  //      expect(() => activate(activationLink)).rejects.toThrowError(
  //        ApiError.BadRequest("Error: Activation link has expired"),
  //      );

  //      expect(storeRegistrationDetailsMock).toHaveBeenCalled();
  //      expect(sendActivationEmailMock).toHaveBeenCalled();
  //      expect(deleteRegistrationDetailsByActivationLinkMock).toHaveBeenCalled();
  //    });

  //    // Test case for incorrect activation link
  //    test("should handle incorrect activation link", async () => {
  //      const activationLink = "non_existing_activation_link";

  //      jest
  //        .spyOn(
  //          require("../redisService"),
  //          "getRegistrationDetailsByActivationLink",
  //        )
  //        .mockResolvedValue(null);

  //      await activate(activationLink);

  //      expect(error instanceof ApiError.BadRequest).toBe(true);
  //      expect(error.message).toContain("Incorrect activation link");
  //    });

  //    test("should handle error during activation", async () => {
  //      const activationLink = "error_activation_link";

  //      jest
  //        .spyOn(
  //          require("../redisService"),
  //          "getRegistrationDetailsByActivationLink",
  //        )
  //        .mockRejectedValue(new Error("Unexpected error"));

  //      await activate(activationLink);
  //      expect(error instanceof ApiError.BadRequest).toBe(true);
  //      expect(error.message).toContain("Unexpected error");
  //    });
  //  });
});
