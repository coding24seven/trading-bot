enum Messages {
  NO_BOT_DATA_AVAILABLE = "no bot data available",
  DATA_MISSING_IN_APP_ENVIRONMENT = "data missing in app environment",
  BOT_CONFIG_INDEXES_MISSING = "bot-config indexes are missing",
  HAND_COUNT_INVALID = "hand count is invalid",
  HAND_SPAN_TOO_NARROW = "too narrow to offset exchange fee. increase hand span.",
  OVERWRITE_EXISTING_DATABASE = "Overwrite existing database? (y/n)",
  DATABASE_OVERRIDDEN_WITH_NEWLY_CREATED_STORE = "database overridden with newly created store",
  DATABASE_NOT_OVERRIDDEN_START_AGAIN = "database not overwritten. start again.",
  DATABASE_EXISTS = "database exists",
  DATABASE_HAD_NOT_EXISTED_BUT_WAS_CREATED = "database had not existed but was just created",
  EXCHANGE_FEE_MUST_NOT_BE_NULL = "exchange fee must not be null",
  IS_NOT_A_NUMBER = "is not a number",
}

export default Messages;
