export default function Footer() {
    return (
      <footer className="w-full border-t py-6 px-4">
        <div className="container flex flex-col items-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            For bugs or issues, please contact: <a href="mailto:inquiry.tcgpockettrades@gmail.com" className="font-medium hover:underline">inquiry.tcgpockettrades@gmail.com</a>
          </p>
          <p className="text-center text-sm leading-loose text-muted-foreground">
            &copy; {new Date().getFullYear()} Charles Camden Spehl. All rights reserved.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            This site is not affiliated with Nintendo, The Pokemon Company, Dena, or Pokemon TCG Pocket.
          </p>
        </div>
      </footer>
    );
  }