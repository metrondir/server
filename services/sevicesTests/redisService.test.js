const redis = require("../../config/redisClient");
const { paginateArray } = require("../paginatedService");
const {
  redisGetModelsWithPaginating,
  storeRecipe,
  getRecipeByUserIdAndRecipeId,
  getRecipesFromUserIdFromRedis,
  getRegistrationDetailsByActivationLink,
  storeRegistrationDetails,
  deleteRegistrationDetailsByActivationLink,
  getCustomer,
  storeCustomer,
  deleteCustomer,
  checkBlackListToken,
  setBlackListToken,
  onDataChanged,
} = require("../redisService");

jest.mock("../../config/redisClient");
jest.mock("../paginatedService");
jest.mock("../../middleware/apiError");

describe("redisGetModelsWithPaginating", () => {
  let funcMock;

  beforeEach(() => {
    funcMock = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return paginated data from Redis", async () => {
    const page = 1;
    const redisKey = "testKey";
    const size = 10;
    const limit = 50;
    const language = "en";
    const refreshToken = "someToken";
    const currency = "USD";
    const args = [];
    const data = [{ id: 1 }, { id: 2 }];
    const paginatedData = [{ id: 1 }];

    redis.get = jest.fn((key, callback) =>
      callback(null, JSON.stringify(data)),
    );
    paginateArray.mockReturnValue(paginatedData);

    const result = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      funcMock,
      limit,
      language,
      refreshToken,
      currency,
      ...args,
    );

    expect(redis.get).toHaveBeenCalledWith(redisKey, expect.any(Function));
    expect(paginateArray).toHaveBeenCalledWith(data, page, size);
    expect(result).toEqual(paginatedData);
    expect(funcMock).not.toHaveBeenCalled();
  });

  test("should fetch data from DB and set in Redis if not available in Redis", async () => {
    const page = 1;
    const redisKey = "testKey";
    const size = 10;
    const limit = 50;
    const language = "en";
    const refreshToken = "someToken";
    const currency = "USD";
    const args = [];
    const data = [{ id: 1 }, { id: 2 }];
    const paginatedData = [{ id: 1 }];

    redis.get = jest.fn((key, callback) => callback(null, null));
    redis.setex = jest.fn();
    funcMock.mockResolvedValue(data);
    paginateArray.mockReturnValue(paginatedData);

    const result = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      funcMock,
      limit,
      language,
      refreshToken,
      currency,
      ...args,
    );

    expect(redis.get).toHaveBeenCalledWith(redisKey, expect.any(Function));
    expect(funcMock).toHaveBeenCalledWith(
      limit,
      language,
      refreshToken,
      currency,
      ...args,
    );
    expect(redis.setex).toHaveBeenCalledWith(
      redisKey,
      60,
      JSON.stringify(data),
    );
    expect(paginateArray).toHaveBeenCalledWith(data, page, size);
    expect(result).toEqual(paginatedData);
  });
  test("should fetch data from DB if data is null dont set in Redis", async () => {
    const page = 1;
    const redisKey = "testKey";
    const size = 10;
    const limit = 50;
    const language = "en";
    const refreshToken = "someToken";
    const currency = "USD";
    const args = [];
    const data = [];
    const paginatedData = [{ id: 1 }];

    redis.get = jest.fn((key, callback) => callback(null, null));
    redis.setex = jest.fn();
    funcMock.mockResolvedValue(data);
    paginateArray.mockReturnValue(paginatedData);

    const result = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      funcMock,
      limit,
      language,
      refreshToken,
      currency,
      ...args,
    );

    expect(redis.get).toHaveBeenCalledWith(redisKey, expect.any(Function));
    expect(funcMock).toHaveBeenCalledWith(
      limit,
      language,
      refreshToken,
      currency,
      ...args,
    );
    expect(redis.setex).toHaveBeenCalledWith(
      redisKey,
      60,
      JSON.stringify(data),
    );
    expect(result).toEqual([]);
    expect(paginateArray).not.toHaveBeenCalled();
  });
});

test("getRecipesFromUserIdFromRedis should return the recipes from Redis", async () => {
  const user = "1234";
  const recipes = [
    {
      user: user,
      id: "1234",
      name: "Recipe",
      description: "Recipe description",
      date: "2021-09-01",
      duration: "30",
      ingredients: ["ingredient1", "ingredient2"],
      steps: ["step1", "step2"],
    },
  ];
  const key = `recipe:${user}`;
  const value = JSON.stringify(recipes[0]);

  redis.keys = jest.fn().mockResolvedValue([key]);

  redis.hgetall = jest.fn().mockResolvedValue({ data: value });

  const result = await getRecipesFromUserIdFromRedis(user);

  expect(redis.keys).toHaveBeenCalledWith(`recipe:${user}*`);

  expect(redis.hgetall).toHaveBeenCalledWith(key);

  expect(result).toEqual(recipes);
});

test("getRecipeByUserIdAndRecipeId should return the recipe from Redis", async () => {
  const recipe = {
    user: "",
    id: "1234",
    name: "Recipe",
    descrption: "Recipe description",
    date: "2021-09-01",
    duration: "30",
    ingredients: ["ingredient1", "ingredient2"],
    steps: ["step1", "step2"],
  };
  const key = `recipe:${recipe.user}${recipe.id}`;
  const field = "data";
  const value = JSON.stringify(recipe);

  redis.hget = jest.fn().mockResolvedValue(value);

  const result = await getRecipeByUserIdAndRecipeId(recipe.user, recipe.id);

  expect(redis.hget).toHaveBeenCalledWith(key, field);
  expect(result).toEqual(recipe);
});

test("storeRecipe should store the recipe in Redis", async () => {
  const recipe = {
    user: "",
    id: "1234",
    name: "Recipe",
    descrption: "Recipe description",
    date: "2021-09-01",
    duration: "30",
    ingredients: ["ingredient1", "ingredient2"],
    steps: ["step1", "step2"],
  };
  const key = `recipe:${recipe.user}${recipe.id}`;
  const field = "data";
  const value = JSON.stringify(recipe);

  redis.hset = jest.fn().mockResolvedValue(true);
  redis.expire = jest.fn().mockResolvedValue(true);

  await storeRecipe(recipe);

  expect(redis.hset).toHaveBeenCalledWith(key, field, value);
  expect(redis.hset).toHaveBeenCalledTimes(1);
  expect(redis.expire).toHaveBeenCalledWith(key, 259200);
  expect(redis.expire).toHaveBeenCalledTimes(1);
});

test("storeRegistrationDetails should store the registration details in Redis", async () => {
  const activationLink = "1234";
  const details = {
    name: "John Doe",
    email: "johnDoe@gmail.com",
  };
  const key = `registrations`;
  const value = JSON.stringify(details);

  redis.hset = jest.fn().mockResolvedValue(true);

  await storeRegistrationDetails(activationLink, details);

  expect(redis.hset).toHaveBeenCalledWith(key, activationLink, value);
  expect(redis.hset).toHaveBeenCalledTimes(1);
});

test("getRegistrationDetailsByActivationLink should return the customer data from Redis", async () => {
  const activationLink = "1234";
  const key = `registrations`;
  const details = {
    name: "John Doe",
    email: "johnDoe@gmail.com",
  };
  const value = JSON.stringify(details);

  redis.hget = jest.fn().mockResolvedValue(value);

  const result = await getRegistrationDetailsByActivationLink(activationLink);

  expect(redis.hget).toHaveBeenCalledWith(key, activationLink);
  expect(result).toEqual(details);
});

test("deleteRegistrationDetailsByActivationLink should return the customer data from Redis", async () => {
  const activationLink = "1234";
  const key = `registrations`;

  redis.hdel = jest.fn().mockResolvedValue(true);

  await deleteRegistrationDetailsByActivationLink(activationLink);

  expect(redis.hdel).toHaveBeenCalledWith(key, activationLink);
});

test("storeCustomer should store the customer in the database", async () => {
  const customer = {
    data: [
      {
        id: "1234",
        name: "John Doe",
        email: "johnDOE@gmail.com",
      },
    ],
  };
  const key = `customer:${customer.data[0].id}`;
  const field = "data";
  const value = JSON.stringify(customer);

  redis.hset = jest.fn().mockResolvedValue(true);
  redis.expire = jest.fn().mockResolvedValue(true);
  redis.hget = jest.fn().mockResolvedValue(value);

  const result = await storeCustomer(customer);
  expect(redis.hset).toHaveBeenCalledWith(key, field, value);
  expect(redis.expire).toHaveBeenCalledWith(key, 600);
  expect(redis.hget).toHaveBeenCalledWith(key, "data");
  expect(result).toEqual(customer);
});

test("deleteCustomer should return the customer data from Redis", async () => {
  const customer = {
    data: [
      {
        id: "1234",
        name: "John Doe",
        email: "johnDOE@gmail.com",
      },
    ],
  };
  const customerId = customer.data[0].id;
  const key = `customer:${customerId}`;

  redis.del = jest.fn().mockResolvedValue(true);

  await deleteCustomer(customerId);

  expect(redis.del).toHaveBeenCalledWith(key);
});

test("getCustomer should return the customer data from Redis", async () => {
  const customer = {
    data: [
      {
        id: "1234",
        name: "John Doe",
        email: "johnDOE@gmail.com",
      },
    ],
  };
  const customerId = customer.data[0].id;
  const key = `customer:${customerId}`;
  const value = JSON.stringify(customer);

  redis.hget = jest.fn().mockResolvedValue(value);

  const result = await getCustomer(customerId);

  expect(redis.hget).toHaveBeenCalledWith(key, "data");

  expect(result).toEqual(customer);
});

test("setBlackListToken should set the token to the blacklist", async () => {
  const token = "12345";
  await setBlackListToken(token);
  expect(redis.hset).toHaveBeenCalledWith("blacklist", token, "blacklisted");
  expect(redis.expire).toHaveBeenCalledWith("blacklist", 900);
});

test("checkBlackListToken should return true if the token is in the blacklist", async () => {
  const token = "12345";

  redis.hexists.mockResolvedValue(true);

  const result = await checkBlackListToken(token);
  expect(result).toBe(true);
});

test("onDataChanged should delete the keys that match the pattern", async () => {
  const ipAddress = "127.0.0.1";
  const pattern = `${ipAddress}*`;
  const keys = ["127.0.0.1:key1", "127.0.0.1:key2"];

  redis.keys = jest.fn().mockResolvedValue(keys);

  redis.del = jest.fn().mockResolvedValue(true);

  await onDataChanged(ipAddress);

  expect(redis.keys).toHaveBeenCalledWith(pattern);

  keys.forEach((key) => {
    expect(redis.del).toHaveBeenCalledWith(key);
  });
});
