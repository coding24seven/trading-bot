enum Messages {
  MISSING = 'missing',
  APP_PORT_MISSING = 'app port is missing',
  HOST_NAME_MISSING = 'host name is missing',
  COMMAND_LINE_ARGUMENTS_INVALID = 'command line arguments are invalid',
  COMMAND_LINE_FILE_PATHS_OR_DIRECTORY_PATH_ARGUMENT_MISSING = 'command line arguments: either <file path(s)> or <directory path> must be present',
  COMMAND_LINE_CURRENCY_SYMBOL_ARGUMENT_MISSING = 'Please specify a currency symbol in the command line, for example: BTC-USDT',
  COMMAND_LINE_OUTPUT_FILE_ARGUMENT_MISSING = 'Please specify an output file path in the command line, for example: my-output-file.csv',
  FILE_PATHS_MISSING = 'file paths are missing',
  FILE_PATHS_INVALID = 'file paths are invalid',
  COMMAND_LINE_COLUMN_NUMBER_ARGUMENT_MISSING = '--column <column number> argument missing',
  COLUMN_NUMBER_INVALID = 'column number is invalid',
  COLUMN_NUMBER_SET_TO_DEFAULT = '*** column containing prices in file set to default (first) because --column argument is missing ***',
  NO_BOT_DATA_AVAILABLE = 'no bot data available',
  BOT_DATA_INVALID = 'bot data invalid',
  APP_ENVIRONMENT_CONFIG_DATA_INVALID = 'invalid config data in app environment',
  ACCOUNT_ENVIRONMENT_CONFIG_DATA_INVALID = 'invalid config data in account environment',
  ACCOUNT_ENVIRONMENT_CONFIG_DATA_MISSING = 'missing config data in account environment',
  BOT_CONFIG_INDEXES_MISSING = 'bot-config indexes are missing',
  BOT_CONFIGURATION_BEING_TESTED = 'bot configuration being tested on historical-price file',
  BOT_WILL_BE_TRIGGERED_WHEN_PRICE = 'bot will be triggered when last price drops below',
  HAND_COUNT_INVALID = 'hand count is invalid',
  HAND_INCREMENT_INVALID = 'hand inrement is invalid',
  HAND_SPAN_TOO_NARROW = 'too narrow to offset exchange fee. increase hand span.',
  BASE_START_AMOUNT_PER_HAND_INVALID = 'base start amount per hand is invalid',
  QUOTE_START_AMOUNT_PER_HAND_INVALID = 'quote start amount per hand is invalid',
  IS_NOT_STRING = 'is not string',
  BASE_MUST_BE_STRING = 'base must be a string',
  QUOTE_MUST_BE_STRING = 'quote must be a string',
  OVERWRITE_EXISTING_DATABASE = 'Overwrite (possibly existing) database? (y/n): ',
  DELETE_EXISTING_DATABASE = 'Delete (possibly existing) database? (y/n): ',
  DATABASE_DELETION_CANCELLED = 'Database deletion has been cancelled',
  DATABASE_SERVER_HAS_NOT_RESPONDED = 'database server has not responded',
  DATABASE_REQUEST_GENERIC_PROBLEM = 'problem with request to database',
  DATABASE_READ_SERVER_CONNECTION_FAIL = 'database read: server-connection fail',
  DATABASE_WRITE_SERVER_CONNECTION_FAIL = 'database write: server-connection fail',
  DATABASE_OVERWRITE_PREVENTED_BY_CLIENT = 'database overwrite prevented by client.',
  CONTINUING_WITH_EXISTING_DATABASE = 'continuing with existing database',
  DATABASE_DOES_NOT_EXIST = 'database does not exist',
  DATABASE_CREATED = 'databased created',
  EXCHANGE_FEE_INVALID = 'exchange fee is invalid',
  EXCHANGE_MINIMUM_TRADE_SIZES_RESPONSE_FAILED = 'exchange: minimum trade sizes could not be obtained',
  EXCHANGE_SYMBOL_DATA_RESPONSE_FAILED = 'exchange: symbol data could not be obtained',
  EXCHANGE_ALL_TICKERS_RESPONSE_FAILED = 'exchange: tickers could not be obtained',
  COULD_NOT_PLACE_ORDER_ON_EXCHANGE = 'order could not be placed',
  ORDER_ID_MISSING_AFTER_ORDER_PLACED = 'order id is missing even though order was placed',
  ATTEMPTING_TO_GET_ORDER_DETAILS_BY_ID = 'attempting to get order details by order id...',
  ORDER_IS_ACTIVE = 'order is active',
  COULD_NOT_GET_ORDER_DETAILS_BY_ID = 'could not get order details by order id',
  SYMBOL_DATA_NOT_FOUND = 'symbol data not found',
  TICKER_NOT_FOUND = 'ticker not found',
  MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET = 'minimum trade sizes allowed by the exchange have not been set',
  TRADE_SIZE_INCREMENT_NOT_SET = 'trade-size increment allowed by the exchange has not been set',
  IS_NOT_A_NUMBER = 'is not a number (as number and as string)',
  IS_NOT_POSITIVE_INTEGER = 'is not a positive integer',
  PRICE_FOR_SYMBOL_BEING_COLLECTED = 'Collecting prices for symbol',
  WRITING_TO_FILE = 'Writing to file',
}

export default Messages
