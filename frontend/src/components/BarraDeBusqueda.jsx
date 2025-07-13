import PropTypes from 'prop-types';

const BarraDeBusqueda = ({ onSearch, placeholder = "" }) => {
  const handleInputChange = (event) => {
    onSearch(event.target.value);
  };

  return (
    <input
      type="text"
      className="border rounded px-4 py-2 w-full"
      placeholder={placeholder}
      onChange={handleInputChange}
      autoComplete="off"
    />
  );
};

BarraDeBusqueda.propTypes = {
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

export default BarraDeBusqueda;