import { render } from 'preact';
import { Popup } from './components/Popup';
import './styles/popup.css';
import { suppressOnUiDebugLogs } from '@/shared/logging';

// Keep onUI debug logs opt-in in production builds.
suppressOnUiDebugLogs();

const container = document.getElementById('app');
if (container) {
  render(<Popup />, container);
}
