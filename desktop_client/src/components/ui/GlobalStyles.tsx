export const GlobalStyles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    ::selection { background: rgba(99, 102, 241, 0.3); color: white; }
  `}</style>
);
