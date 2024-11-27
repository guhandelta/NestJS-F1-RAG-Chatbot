import './global.css';


export const metadata = {
    title: 'F1GPT',
    description: 'A place for all your Formula One questions'
};

const RootLayout = ({children}) => (
    <html lang='en'>
        <body>
            {children}
        </body>
    </html>
);

export default RootLayout;