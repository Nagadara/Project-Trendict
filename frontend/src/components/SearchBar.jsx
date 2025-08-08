import React from 'react';
import './SearchBar.css';
import { useAuth } from '../context/useAuth';


function SearchBar(){
    const { loggedIn } = useAuth();
    return(
        <div className="search-bar">
            <input type="text" placeholder="종목 검색" className="search-input" />
        </div>
            
    );
}

export default SearchBar;
