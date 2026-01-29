import logo from '@/assets/logo-escola-franchising.svg';

export function MobileHeader() {
  return (
    <div className="md:hidden sticky top-0 z-50 flex items-center justify-center py-3 px-4 bg-background border-b border-border safe-area-top">
      <img 
        src={logo} 
        alt="Escola do Franchising" 
        className="h-8 w-auto"
      />
    </div>
  );
}
