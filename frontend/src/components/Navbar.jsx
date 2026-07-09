import { Navbar as BootstrapNavbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" className="custom-navbar">
      <Container fluid>
        <BootstrapNavbar.Brand as={Link} to="/" className="me-auto">Weather Tracker</BootstrapNavbar.Brand>
        {/* Removed Navbar.Toggle and Navbar.Collapse for simplicity as links are removed */}
        {/* 
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          <Nav>
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/register">Register</Nav.Link>
            <Nav.Link as={Link} to="/signin">Sign In</Nav.Link>
          </Nav>
        </BootstrapNavbar.Collapse>
        */}
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar; 