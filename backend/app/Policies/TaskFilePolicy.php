<?php

namespace App\Policies;

/** A company works only with its own TaskFile records (CompanyOwnedPolicy). */
class TaskFilePolicy extends CompanyOwnedPolicy {}
