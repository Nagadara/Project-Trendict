import React from 'react';
import './Header.css';
import Logo from '../assets/logo.svg';
import SearchBar from './SearchBar';

function Header(){
    return(
        <header className="header">

            <div className="logo">
                <img src={Logo} alt='Trendict Logo' className="logo-img"/>
            </div>

            <SearchBar />
            <button className="login-btn" type="button">로그인</button>
        </header>
    );
}

export default Header;
