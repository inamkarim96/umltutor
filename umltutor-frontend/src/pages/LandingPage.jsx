import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

// Standard JSX SVG components
const LayoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="3" x2="21" y1="9" y2="9" />
    <line x1="9" x2="9" y1="21" y2="9" />
  </svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const BarChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

const WorkflowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const GraduationCapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const { state: { mode } } = useAppContext();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <GraduationCapIcon />
                </div>
                <span className="text-2xl font-black text-gray-900 tracking-tighter">UML<span className="text-indigo-600">Tutor</span></span>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-8">
              <Link
                to="/login"
                className="text-gray-500 hover:text-indigo-600 font-bold text-sm uppercase tracking-widest transition-all"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-100 transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white py-24 md:py-32 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 -z-10"></div>
        
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="text-center w-full">

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 tracking-tight leading-[1.1]">
              The Smart Way to <br />
              <span className="text-indigo-600 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Master UML</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
              The intelligent platform for building professional diagrams with deep semantic analysis, consistency checks, and guided modeling.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95">
                Start Learning Free
              </Link>
              <Link to="/login" className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-[2rem] font-black text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95">
                Teacher Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About UMLTutor Section */}
      <section className="py-16 bg-white">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About UMLTutor</h2>
            <div className="w-20 h-1 bg-indigo-600 mx-auto rounded" />
          </div>
          <div className="w-full text-center">
            <p className="text-lg text-gray-600 leading-relaxed">
              UMLTutor is an intelligent platform specifically designed for teaching and learning Unified Modeling Language (UML). The platform bridges the gap between theoretical UML knowledge and practical application, providing students with a hands-on environment to create, manage, and refine their UML models within a structured assignment workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Modules</h2>
            <p className="text-gray-600 w-full mx-auto font-medium">Focused tools designed for the core UML modeling workflow</p>
            <div className="w-20 h-1 bg-indigo-600 mx-auto rounded mt-4" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-600"><LayoutIcon /></span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Use Case Diagrams</h3>
              <p className="text-gray-600 text-sm">Create comprehensive UML Use Case diagrams with actor and use case management.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-600"><BookOpenIcon /></span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Use Case Descriptions</h3>
              <p className="text-gray-600 text-sm">Document detailed specifications for each use case using structured templates.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-600"><WorkflowIcon /></span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Sequence Diagrams</h3>
              <p className="text-gray-600 text-sm">Build SSDs derived from use case flows with semantic message validation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Information Section */}
      <section className="py-16 bg-white">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Project Information</h2>
            <div className="w-20 h-1 bg-indigo-600 mx-auto rounded" />
          </div>
          <div className="grid md:grid-cols-2 gap-8 w-full">
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white"><UsersIcon /></span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Inam Karim</h3>
              <p className="text-gray-600 mb-4">Developer & Creator of UMLTutor</p>
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <MailIcon />
                <a href="mailto:inamkarim96@gmail.com" className="text-indigo-600 hover:text-indigo-700 font-medium">inamkarim96@gmail.com</a>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white"><GraduationCapIcon /></span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Dr. Onaiza Maqbool</h3>
              <p className="text-gray-600 mb-4">Project Supervisor</p>
              <div className="flex items-center justify-center gap-2 text-gray-700 h-6">
                {/* Placeholder for future contact info or links if needed */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="mb-4">
                <span className="text-xl font-bold text-white">UMLTutor</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                A smart web-based learning environment designed to help students practice and master UML modeling through a structured workflow.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Log In</Link></li>
                <li><Link to="/signup" className="text-gray-400 hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="text-gray-400">Developer: Inam Karim</li>
                <li><a href="mailto:inamkarim96@gmail.com" className="text-gray-400 hover:text-white transition-colors">inamkarim96@gmail.com</a></li>
                <li className="text-gray-400 mt-2">Supervisor: Dr. Onaiza Maqbool</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-500">© {new Date().getFullYear()} UMLTutor.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

