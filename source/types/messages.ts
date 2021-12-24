enum Messages {
  NO_BOT_DATA_AVAILABLE = "no bot data available",
  DATA_MISSING_IN_APP_ENVIRONMENT = "data missing in app environment",
  BOT_CONFIG_INDEXES_MISSING = "bot-config indexes are missing",
  HAND_COUNT_INVALID = "hand count is invalid",
  HAND_SPAN_TOO_NARROW = "too narrow to offset exchange fee. increase hand span.",
  OVERWRITE_EXISTING_DATABASE = "Overwrite (possibly existing) database? (y/n): ",
  DATABASE_SERVER_HAS_NOT_RESPONDED = "database server has not responded",
  DATABASE_REQUEST_GENERIC_PROBLEM = "problem with request to database",
  DATABASE_READ_SERVER_CONNECTION_FAIL = "database read: server-connection fail",
  DATABASE_WRITE_SERVER_CONNECTION_FAIL = "database write: server-connection fail",
  DATABASE_OVERWRITE_PREVENTED_BY_CLIENT = "database overwrite prevented by client.",
  DATABASE_EXISTS = "database exists",
  DATABASE_DOES_NOT_EXIST = "database does not exist",
  DATABASE_CREATED = "databased created",
  EXCHANGE_FEE_MUST_NOT_BE_NULL = "exchange fee must not be null",
  EXCHANGE_MINIMUM_TRADE_SIZES_RESPONSE_FAILED = "exchange: minimum trade sizes could not be obtained",
  MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET = "minimum trade sizes allowed by the exchange have not been set",
  IS_NOT_A_NUMBER = "is not a number",
}

export default Messages;
