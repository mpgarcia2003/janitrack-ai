import AIDebugger from './pages/AIDebugger';
import Areas from './pages/Areas';
import Billing from './pages/Billing';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import FeedbackQR from './pages/FeedbackQR';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import InventoryAccess from './pages/InventoryAccess';
import InventoryReports from './pages/InventoryReports';
import NewProjectQR from './pages/NewProjectQR';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import ScanCheckIn from './pages/ScanCheckIn';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import TenantSignup from './pages/TenantSignup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIDebugger": AIDebugger,
    "Areas": Areas,
    "Billing": Billing,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "Feedback": Feedback,
    "FeedbackQR": FeedbackQR,
    "Home": Home,
    "Inventory": Inventory,
    "InventoryAccess": InventoryAccess,
    "InventoryReports": InventoryReports,
    "NewProjectQR": NewProjectQR,
    "Projects": Projects,
    "Reports": Reports,
    "ScanCheckIn": ScanCheckIn,
    "Settings": Settings,
    "SuperAdmin": SuperAdmin,
    "TenantSignup": TenantSignup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};