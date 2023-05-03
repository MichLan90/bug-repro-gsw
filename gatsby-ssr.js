const React = require("react");
const PropTypes = require("prop-types");
const GlobalContextProvider =
  require("./src/context/global-context-provider").default;

const RootElement = ({ element }) => {
  return <GlobalContextProvider>{element}</GlobalContextProvider>;
};

RootElement.propTypes = {
  element: PropTypes.node,
};

exports.wrapRootElement = RootElement;
