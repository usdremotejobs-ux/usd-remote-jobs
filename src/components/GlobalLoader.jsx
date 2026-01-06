import { Briefcase } from 'lucide-react'

export default function GlobalLoader() {
  return (
    <div className="loader-container">
      <div className="loader-content">
        {/* Bouncing Logo */}
        <div className="bounce-icon">
          <Briefcase size={48} color="#045149" />
        </div>
        
        {/* Text */}
        <h2 className="loader-text">
          Fetching USD Remote Jobs...
        </h2>
        
        {/* Simple Loading Bar */}
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>

      <style>{`
        .loader-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .loader-content {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loader-text {
          font-family: sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          animation: pulse 2s infinite;
        }

        .bounce-icon {
          animation: bounce 2s infinite;
        }

        .loading-bar {
          width: 200px;
          height: 4px;
          background: #e5e7eb;
          border-radius: 99px;
          overflow: hidden;
        }

        .loading-progress {
          width: 50%;
          height: 100%;
          background: #045149; /* Your primary color */
          border-radius: 99px;
          animation: slide 1.5s infinite ease-in-out;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
