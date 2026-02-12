import { render } from 'preact';
import { Popup } from './components/Popup';
import './styles/popup.css';

const container = document.getElementById('app');
if (container) {
  render(<Popup />, container);
}
